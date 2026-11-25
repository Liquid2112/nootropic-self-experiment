/**
 * Android home-screen widget (expo-widgets, Jetpack Compose Glance via
 * @expo/ui). Same contract as the iOS layout: the 'widget' function runs on its
 * own in the widget runtime, so it only uses its props and @expo/ui globals.
 * Android has no Live Activity; the check-in reminder notification covers it.
 */
import { Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { WidgetSnapshot } from './model';
import type { NativeWidgetBridge } from './bridge';

function TodayWidgetLayout(props: WidgetSnapshot) {
  'widget';
  const ink = '#15131C';
  const muted = '#6D6878';
  const coral = '#FF5A36';
  const green = '#1FAE6B';
  const countdown = props.daysToVerdict === 1 ? '1 day' : `${props.daysToVerdict} days`;
  return (
    <Column modifiers={[fillMaxSize(), background('#F7F4EE'), cornerRadius(20), paddingAll(14)]}>
      <Row>
        <Text color={muted} style={{ fontSize: 12, fontWeight: '600' }}>
          {props.headline}
        </Text>
        <Spacer />
        {props.streak > 0 ? (
          <Text color={coral} style={{ fontSize: 12, fontWeight: '700' }}>
            {`${props.streak}-day streak`}
          </Text>
        ) : null}
      </Row>
      <Text color={ink} style={{ fontSize: 22, fontWeight: '800' }}>
        {props.instruction}
      </Text>
      <Text color={muted} style={{ fontSize: 12 }}>
        {props.nudge}
      </Text>
      <Row>
        <Text color={props.doseDone ? green : muted} style={{ fontSize: 12, fontWeight: '600' }}>
          {props.doseDone ? 'Dose ✓  ' : 'Dose ○  '}
        </Text>
        <Text color={props.checkInDone ? green : muted} style={{ fontSize: 12, fontWeight: '600' }}>
          {props.checkInDone ? 'Check-in ✓' : 'Check-in ○'}
        </Text>
      </Row>
      <Text color={ink} style={{ fontSize: 12, fontWeight: '700' }}>
        {props.phase === 'ready' ? 'Your verdict is ready' : `Verdict in ${countdown} · sealed until ${props.verdictDateLabel}`}
      </Text>
    </Column>
  );
}

const todayWidget = createWidget<WidgetSnapshot>('PlaceboToday', TodayWidgetLayout);

export const nativeWidgetBridge: NativeWidgetBridge = {
  available: true,
  setTimeline(entries) {
    // Android widgets show a snapshot; the app refreshes it on every open and
    // after every dose or check-in.
    const current = entries[0];
    if (current) todayWidget.updateSnapshot(current.props);
  },
  runningActivityCount() {
    return 0;
  },
  async startActivity() {},
  async updateActivity() {},
  async endActivities() {},
};
