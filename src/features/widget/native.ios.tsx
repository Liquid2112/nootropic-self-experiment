/**
 * iOS home-screen widget + check-in Live Activity (expo-widgets, SwiftUI via
 * @expo/ui). The layouts are marked with the 'widget' directive: Babel turns
 * each into a string that the widget extension runs on its own, so they may only
 * use their props and the @expo/ui globals. No module constants, no imports at
 * runtime. Brand colors are written inline for that reason (Ink #15131C, Paper
 * #F7F4EE, Coral #FF5A36, Line #E7E1D6, Muted #6D6878, Green #1FAE6B).
 *
 * The app config registers the widget and Live Activity by these names (see the
 * expo-widgets entry in app.json).
 */
import { Gauge, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  widgetURL,
  activityBackgroundTint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, createWidget } from 'expo-widgets';
import type { LiveActivityEnvironment, WidgetEnvironment } from 'expo-widgets';
import type { LiveActivityProps, WidgetSnapshot } from './model';
import type { NativeWidgetBridge } from './bridge';

function TodayWidgetLayout(props: WidgetSnapshot, env: WidgetEnvironment) {
  'widget';
  const ink = '#15131C';
  const muted = '#6D6878';
  const coral = '#FF5A36';
  const green = '#1FAE6B';
  const paper = '#F7F4EE';
  const family = env.widgetFamily ?? 'systemSmall';
  const countdown = props.daysToVerdict === 1 ? '1 day' : `${props.daysToVerdict} days`;
  const windowOpen =
    props.windowStartMs > 0 &&
    (env.date ? env.date.getTime() : Date.now()) >= props.windowStartMs &&
    (env.date ? env.date.getTime() : Date.now()) < props.windowEndMs;

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL(props.url)]}>
        {props.phase === 'ready' ? 'Placebo: verdict ready' : `${props.instruction} · reveal in ${countdown}`}
      </Text>
    );
  }

  if (family === 'accessoryCircular') {
    return (
      <Gauge
        value={props.progress}
        modifiers={[widgetURL(props.url)]}
        currentValueLabel={<Text>{props.phase === 'ready' ? '!' : `${props.daysToVerdict}`}</Text>}
      >
        <Text>days</Text>
      </Gauge>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL(props.url)]}>
        <Text modifiers={[font({ size: 13, weight: 'bold' })]}>{props.instruction}</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.nudge}</Text>
        <Text modifiers={[font({ size: 12 })]}>
          {props.phase === 'ready' ? 'Verdict ready' : `Reveal in ${countdown} · ${props.streak}d streak`}
        </Text>
      </VStack>
    );
  }

  const header = (
    <HStack spacing={6}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>{props.headline}</Text>
      <Spacer />
      {props.streak > 0 ? (
        <HStack spacing={2}>
          <Image systemName="flame.fill" size={12} color={coral} />
          <Text modifiers={[font({ size: 12, weight: 'bold', design: 'rounded' }), foregroundStyle(ink)]}>
            {`${props.streak}`}
          </Text>
        </HStack>
      ) : null}
    </HStack>
  );

  const checklist = (
    <VStack alignment="leading" spacing={4}>
      <HStack spacing={6}>
        <Image systemName={props.doseDone ? 'checkmark.circle.fill' : 'circle'} size={14} color={props.doseDone ? green : muted} />
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(ink)]}>Dose</Text>
      </HStack>
      <HStack spacing={6}>
        <Image
          systemName={props.checkInDone ? 'checkmark.circle.fill' : 'circle'}
          size={14}
          color={props.checkInDone ? green : muted}
        />
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(ink)]}>Check-in</Text>
        {windowOpen && !props.checkInDone ? (
          <Text
            timerInterval={{ lower: new Date(props.windowStartMs), upper: new Date(props.windowEndMs) }}
            countsDown
            modifiers={[font({ size: 12, weight: 'semibold', design: 'monospaced' }), foregroundStyle(coral)]}
          />
        ) : null}
      </HStack>
    </VStack>
  );

  const reveal = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>
        {props.phase === 'ready' ? 'YOUR VERDICT' : 'VERDICT IN'}
      </Text>
      <Text modifiers={[font({ size: 28, weight: 'heavy', design: 'rounded' }), foregroundStyle(ink)]}>
        {props.phase === 'ready' ? 'Ready' : countdown}
      </Text>
      {props.verdictDateLabel ? (
        <HStack spacing={4}>
          <Image systemName="lock.fill" size={10} color={muted} />
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{`Sealed until ${props.verdictDateLabel}`}</Text>
        </HStack>
      ) : null}
    </VStack>
  );

  if (family === 'systemSmall') {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[containerBackground(paper, 'widget'), widgetURL(props.url)]}
      >
        {header}
        <Text modifiers={[font({ size: 22, weight: 'heavy', design: 'rounded' }), foregroundStyle(ink)]}>
          {props.instruction}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.nudge}</Text>
        <Spacer />
        <HStack spacing={4}>
          <Image systemName="lock.fill" size={10} color={muted} />
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>
            {props.phase === 'ready' ? 'Verdict ready' : `Reveal in ${countdown}`}
          </Text>
        </HStack>
      </VStack>
    );
  }

  return (
    <HStack spacing={14} modifiers={[containerBackground(paper, 'widget'), widgetURL(props.url)]}>
      <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: 10000, alignment: 'leading' })]}>
        {header}
        <Text modifiers={[font({ size: 22, weight: 'heavy', design: 'rounded' }), foregroundStyle(ink)]}>
          {props.instruction}
        </Text>
        {checklist}
      </VStack>
      <ZStack modifiers={[padding({ leading: 4 })]}>{reveal}</ZStack>
    </HStack>
  );
}

function CheckInActivityLayout(props: LiveActivityProps, env: LiveActivityEnvironment) {
  'widget';
  const ink = '#15131C';
  const coral = '#FF5A36';
  const paper = '#F7F4EE';
  const muted = '#6D6878';
  const dark = env.colorScheme === 'dark';
  const timer = (
    <Text
      timerInterval={{ lower: new Date(Date.now()), upper: new Date(props.closesAtMs) }}
      countsDown
      modifiers={[font({ size: 15, weight: 'bold', design: 'monospaced' }), foregroundStyle(coral)]}
    />
  );
  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 }), activityBackgroundTint(dark ? ink : paper)]}>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>
            {`${props.headline} · ${props.instruction}`}
          </Text>
          <Text modifiers={[font({ size: 17, weight: 'heavy', design: 'rounded' }), foregroundStyle(dark ? paper : ink)]}>
            Check-in open
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
            {`${props.streak}-day streak · reveal in ${props.daysToVerdict} days`}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>CLOSES IN</Text>
          {timer}
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName="brain.head.profile" color={coral} />,
    compactTrailing: timer,
    minimal: <Image systemName="brain.head.profile" color={coral} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>{props.headline}</Text>
        <Text modifiers={[font({ size: 17, weight: 'heavy', design: 'rounded' })]}>{props.instruction}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>CLOSES IN</Text>
        {timer}
      </VStack>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 13 })]}>
        {`90-second check-in keeps your ${props.streak}-day streak. Reveal in ${props.daysToVerdict} days.`}
      </Text>
    ),
  };
}

const todayWidget = createWidget<WidgetSnapshot>('PlaceboToday', TodayWidgetLayout);
const checkInActivity = createLiveActivity<LiveActivityProps>('PlaceboCheckIn', CheckInActivityLayout);

export const nativeWidgetBridge: NativeWidgetBridge = {
  available: true,
  setTimeline(entries) {
    todayWidget.updateTimeline(entries.map((e) => ({ date: new Date(e.dateMs), props: e.props })));
  },
  runningActivityCount() {
    return checkInActivity.getInstances().length;
  },
  async startActivity(props, staleAtMs) {
    checkInActivity.start(props, props.url, new Date(staleAtMs));
  },
  async updateActivity(props, staleAtMs) {
    await Promise.all(checkInActivity.getInstances().map((a) => a.update(props, new Date(staleAtMs))));
  },
  async endActivities() {
    await Promise.all(checkInActivity.getInstances().map((a) => a.end('immediate')));
  },
};
