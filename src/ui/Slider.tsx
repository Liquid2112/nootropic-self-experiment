import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
  type ViewStyle,
} from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export type SliderProps = {
  /** Current value. Clamped into [min, max] and snapped to `step`. */
  value: number;
  /** Called with the next snapped value as the user drags. */
  onChange: (value: number) => void;
  /** Minimum value. Defaults to 0. */
  min?: number;
  /** Maximum value. Defaults to 10 (the daily 0-10 self-rating range). */
  max?: number;
  /** Step size. Defaults to 1 so values are whole numbers. */
  step?: number;
  /** Optional label shown above the track. */
  label?: string;
  /** Hide the numeric value readout. */
  hideValue?: boolean;
  /** Optional caption under the left end of the track (e.g. "Foggy"). */
  lowLabel?: string;
  /** Optional caption under the right end of the track (e.g. "Sharp"). */
  highLabel?: string;
  /** Test id forwarded to the interactive track. */
  testID?: string;
  /** Disable interaction and dim the control. */
  disabled?: boolean;
  style?: ViewStyle;
};

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 28;

function snap(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const steps = Math.round((clamped - min) / step);
  const snapped = min + steps * step;
  // Guard against floating-point fuzz so the emitted value stays clean.
  return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
}

/**
 * Discrete slider for the daily self-rating inputs. Built on PanResponder and
 * on-layout measurement so it needs no native slider module. The parent owns
 * the value (controlled); each drag frame emits the nearest snapped value.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  label,
  hideValue = false,
  lowLabel,
  highLabel,
  testID,
  disabled = false,
  style,
}: SliderProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);

  const range = max - min;
  const fraction = range === 0 ? 0 : (snap(value, min, max, step) - min) / range;

  // Latest props for the gesture handlers. The PanResponder is created once;
  // its handlers read this ref at event time, never during render.
  const latest = useRef({ value, onChange, min, max, step, range, disabled });
  useEffect(() => {
    latest.current = { value, onChange, min, max, step, range, disabled };
  });

  // The refs are only read inside the gesture handlers (event time). The
  // compiler can't see that through PanResponder.create, hence the disable.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const emitFromX = (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const p = latest.current;
      const ratio = Math.min(1, Math.max(0, x / w));
      const next = snap(p.min + ratio * p.range, p.min, p.max, p.step);
      if (next !== p.value) p.onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        emitFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        // locationX can report relative to the thumb once it captures the
        // gesture; fall back to the gesture's moveX when it isn't finite.
        const localX = evt.nativeEvent.locationX;
        emitFromX(Number.isFinite(localX) ? localX : gesture.moveX);
      },
    });
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  };

  const thumbLeft = Math.max(
    0,
    Math.min(trackWidth - THUMB_SIZE, fraction * trackWidth - THUMB_SIZE / 2),
  );

  return (
    <View style={[disabled ? styles.disabled : null, style]}>
      {(label !== undefined || !hideValue) && (
        <View style={styles.header}>
          {label !== undefined ? (
            <AppText variant="subhead" color="textSecondary">
              {label}
            </AppText>
          ) : (
            <View />
          )}
          {!hideValue && (
            <AppText variant="headline" color="accent">
              {snap(value, min, max, step)}
            </AppText>
          )}
        </View>
      )}
      <View
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: snap(value, min, max, step) }}
        testID={testID}
        style={styles.touch}
        onLayout={onLayout}
        {...responder.panHandlers}
      >
        <View
          style={[
            styles.track,
            { backgroundColor: theme.colors.fill, borderRadius: theme.radius.pill },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.pill,
                width: `${fraction * 100}%`,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            theme.shadows.sm,
            {
              left: thumbLeft,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textPrimary,
            },
          ]}
        />
      </View>
      {(lowLabel !== undefined || highLabel !== undefined) && (
        <View style={styles.ends}>
          <AppText variant="caption2" color="textTertiary">
            {lowLabel ?? ''}
          </AppText>
          <AppText variant="caption2" color="textTertiary">
            {highLabel ?? ''}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  touch: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    top: 0,
  },
  disabled: {
    opacity: 0.4,
  },
});
