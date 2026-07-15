import type { ReactNode, Ref } from "react";
import {
  type AccessibilityRole,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export type StatusNoticeTone = "critical" | "warning" | "info" | "neutral" | "success" | "error";

type ActionProps = {
  label: string;
  accessibilityLabel?: string | undefined;
  onPress: () => void;
  disabled?: boolean | undefined;
};

export function ScreenHeader({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {body === undefined ? null : <Text style={styles.body}>{body}</Text>}
    </View>
  );
}

export function ScreenSection({
  title,
  body,
  children,
}: {
  title?: string | undefined;
  body?: string | undefined;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title === undefined && body === undefined ? null : (
        <View style={styles.sectionHeader}>
          {title === undefined ? null : <Text style={styles.sectionTitle}>{title}</Text>}
          {body === undefined ? null : <Text style={styles.sectionBody}>{body}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

export function PrimaryAction({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: ActionProps) {
  return (
    <Pressable
      android_ripple={{ color: captureColors.accentPressed }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryAction,
        pressed && !disabled ? styles.primaryActionPressed : undefined,
        disabled ? styles.actionDisabled : undefined,
      ]}
    >
      <Text style={styles.primaryActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryAction({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: ActionProps) {
  return (
    <Pressable
      android_ripple={{ color: captureColors.surfacePressed }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        pressed && !disabled ? styles.secondaryActionPressed : undefined,
        disabled ? styles.actionDisabled : undefined,
      ]}
    >
      <Text
        style={[styles.secondaryActionLabel, disabled ? styles.actionLabelDisabled : undefined]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DestructiveAction({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: ActionProps) {
  return (
    <Pressable
      android_ripple={{ color: captureColors.criticalPressed }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destructiveAction,
        pressed && !disabled ? styles.destructiveActionPressed : undefined,
        disabled ? styles.actionDisabled : undefined,
      ]}
    >
      <Text style={styles.destructiveActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  inputRef,
  keyboardType,
  editable = true,
  onSubmitEditing,
  returnKeyType = "done",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
  inputRef?: Ref<TextInput> | undefined;
  keyboardType?: KeyboardTypeOptions | undefined;
  editable?: boolean | undefined;
  onSubmitEditing?: (() => void) | undefined;
  returnKeyType?: "done" | "go" | "next" | "search" | "send" | undefined;
  secureTextEntry?: boolean | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={captureColors.subtleInk}
        returnKeyType={returnKeyType}
        selectionColor={captureColors.accent}
        secureTextEntry={secureTextEntry}
        style={[
          styles.field,
          !editable ? styles.fieldDisabled : undefined,
          error === undefined ? undefined : styles.fieldError,
        ]}
        value={value}
      />
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function DatePickerAction({
  label,
  value,
  onPress,
  error,
}: {
  label: string;
  value: string;
  onPress: () => void;
  error?: string | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        android_ripple={{ color: captureColors.surfacePressed }}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.dateAction,
          pressed ? styles.dateActionPressed : undefined,
          error === undefined ? undefined : styles.fieldError,
        ]}
      >
        <Text style={styles.dateActionValue}>{value}</Text>
        <Text style={styles.dateActionHint}>Selecionar</Text>
      </Pressable>
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function SelectionRow({
  label,
  detail,
  selected = false,
  onPress,
}: {
  label: string;
  detail?: string | undefined;
  selected?: boolean | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable
      android_ripple={{ color: captureColors.surfacePressed }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionRow,
        selected ? styles.selectionRowSelected : undefined,
        pressed ? styles.selectionRowPressed : undefined,
      ]}
    >
      <View style={styles.selectionText}>
        <Text style={styles.selectionLabel}>{label}</Text>
        {detail === undefined ? null : <Text style={styles.selectionDetail}>{detail}</Text>}
      </View>
      <View style={[styles.selectionMark, selected ? styles.selectionMarkSelected : undefined]}>
        {selected ? <Text style={styles.selectionMarkText}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

export function SummaryMetric({
  value,
  label,
  tone = "neutral",
}: {
  value: string | number;
  label: string;
  tone?: "neutral" | "success" | "warning" | "critical" | undefined;
}) {
  return (
    <View
      style={[
        styles.metric,
        tone === "success" ? styles.metricSuccess : undefined,
        tone === "warning" ? styles.metricWarning : undefined,
        tone === "critical" ? styles.metricCritical : undefined,
      ]}
    >
      <Text
        style={[
          styles.metricValue,
          tone === "success" ? styles.metricSuccessText : undefined,
          tone === "warning" ? styles.metricWarningText : undefined,
          tone === "critical" ? styles.metricCriticalText : undefined,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function StatusNotice({
  title,
  children,
  tone = "info",
  accessibilityRole,
}: {
  title?: string | undefined;
  children: ReactNode;
  tone?: StatusNoticeTone | undefined;
  accessibilityRole?: AccessibilityRole | undefined;
}) {
  const normalizedTone = tone === "error" ? "critical" : tone;
  const resolvedRole = accessibilityRole ?? (normalizedTone === "critical" ? "alert" : "text");

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={resolvedRole}
      style={[
        styles.notice,
        normalizedTone === "critical" ? styles.noticeCritical : undefined,
        normalizedTone === "warning" ? styles.noticeWarning : undefined,
        normalizedTone === "neutral" ? styles.noticeNeutral : undefined,
        normalizedTone === "success" ? styles.noticeSuccess : undefined,
      ]}
    >
      {title === undefined ? null : (
        <Text
          style={[
            styles.noticeTitle,
            normalizedTone === "critical" ? styles.noticeCriticalText : undefined,
            normalizedTone === "warning" ? styles.noticeWarningText : undefined,
            normalizedTone === "success" ? styles.noticeSuccessText : undefined,
          ]}
        >
          {title}
        </Text>
      )}
      <Text
        style={[
          styles.noticeText,
          normalizedTone === "critical" ? styles.noticeCriticalText : undefined,
          normalizedTone === "warning" ? styles.noticeWarningText : undefined,
          normalizedTone === "success" ? styles.noticeSuccessText : undefined,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: captureSpacing.small,
    marginBottom: captureSpacing.xsmall,
  },
  title: {
    color: captureColors.ink,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 29,
  },
  body: {
    color: captureColors.mutedInk,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.medium,
  },
  sectionHeader: {
    gap: captureSpacing.xsmall,
  },
  sectionTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  sectionBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: captureColors.accent,
    borderColor: captureColors.accentPressed,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryActionPressed: {
    backgroundColor: captureColors.accentPressed,
  },
  primaryActionLabel: {
    color: captureColors.onAccent,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.borderStrong,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryActionPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  secondaryActionLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  destructiveAction: {
    alignItems: "center",
    backgroundColor: captureColors.critical,
    borderColor: captureColors.criticalPressed,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  destructiveActionPressed: {
    backgroundColor: captureColors.criticalPressed,
  },
  destructiveActionLabel: {
    color: captureColors.onAccent,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionLabelDisabled: {
    color: captureColors.mutedInk,
  },
  fieldGroup: {
    gap: captureSpacing.xsmall,
  },
  fieldLabel: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  field: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.borderStrong,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  fieldDisabled: {
    backgroundColor: captureColors.surfaceMuted,
  },
  fieldError: {
    borderColor: captureColors.critical,
  },
  errorText: {
    color: captureColors.critical,
    fontSize: 14,
    lineHeight: 20,
  },
  dateAction: {
    alignItems: "center",
    backgroundColor: captureColors.surface,
    borderColor: captureColors.borderStrong,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dateActionPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  dateActionValue: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  dateActionHint: {
    color: captureColors.accent,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  selectionRow: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
    minHeight: 56,
    padding: captureSpacing.medium,
  },
  selectionRowPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  selectionRowSelected: {
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
  },
  selectionText: {
    flex: 1,
    gap: 2,
  },
  selectionLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  selectionDetail: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionMark: {
    alignItems: "center",
    borderColor: captureColors.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  selectionMarkSelected: {
    backgroundColor: captureColors.accent,
    borderColor: captureColors.accent,
  },
  selectionMarkText: {
    color: captureColors.onAccent,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  metric: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flex: 1,
    minHeight: 64,
    padding: captureSpacing.small,
  },
  metricSuccess: {
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
  },
  metricWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  metricCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  metricValue: {
    color: captureColors.ink,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 29,
  },
  metricLabel: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
  },
  metricSuccessText: {
    color: captureColors.accent,
  },
  metricWarningText: {
    color: captureColors.warningInk,
  },
  metricCriticalText: {
    color: captureColors.critical,
  },
  notice: {
    backgroundColor: captureColors.infoSurface,
    borderColor: captureColors.infoBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    padding: captureSpacing.medium,
  },
  noticeCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  noticeWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  noticeNeutral: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
  },
  noticeSuccess: {
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
  },
  noticeTitle: {
    color: captureColors.infoInk,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  noticeText: {
    color: captureColors.infoInk,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCriticalText: {
    color: captureColors.critical,
  },
  noticeWarningText: {
    color: captureColors.warningInk,
  },
  noticeSuccessText: {
    color: captureColors.accent,
  },
});
