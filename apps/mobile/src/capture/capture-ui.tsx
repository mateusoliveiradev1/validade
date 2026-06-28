import type { ReactNode } from "react";
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

export function ScreenHeader({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {body === undefined ? null : <Text style={styles.body}>{body}</Text>}
    </View>
  );
}

export function PrimaryAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryAction,
        pressed && !disabled ? styles.primaryActionPressed : undefined,
        disabled ? styles.primaryActionDisabled : undefined,
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
}: {
  label: string;
  accessibilityLabel?: string | undefined;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        pressed && !disabled ? styles.secondaryActionPressed : undefined,
        disabled ? styles.secondaryActionDisabled : undefined,
      ]}
    >
      <Text style={styles.secondaryActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function DestructiveAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destructiveAction,
        pressed && !disabled ? styles.destructiveActionPressed : undefined,
        disabled ? styles.destructiveActionDisabled : undefined,
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
  keyboardType,
  editable = true,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
  keyboardType?: KeyboardTypeOptions | undefined;
  editable?: boolean | undefined;
  secureTextEntry?: boolean | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={captureColors.mutedInk}
        secureTextEntry={secureTextEntry}
        style={[styles.field, error === undefined ? undefined : styles.fieldError]}
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
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.dateAction, error === undefined ? undefined : styles.fieldError]}
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
  detail?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.selectionRow, selected ? styles.selectionRowSelected : undefined]}
    >
      <Text style={styles.selectionLabel}>{label}</Text>
      {detail === undefined ? null : <Text style={styles.selectionDetail}>{detail}</Text>}
    </Pressable>
  );
}

export function StatusNotice({
  children,
  tone = "info",
  title,
  accessibilityRole,
}: {
  children: ReactNode;
  tone?: StatusNoticeTone;
  title?: string | undefined;
  accessibilityRole?: AccessibilityRole | undefined;
}) {
  const normalizedTone = tone === "error" ? "critical" : tone;
  const resolvedRole =
    accessibilityRole ??
    (normalizedTone === "critical" || normalizedTone === "warning" ? "alert" : "text");

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
    marginBottom: captureSpacing.large,
  },
  title: {
    color: captureColors.ink,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  body: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: captureColors.accent,
    borderRadius: captureRadii.small,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionPressed: {
    backgroundColor: captureColors.accentPressed,
  },
  primaryActionDisabled: {
    backgroundColor: captureColors.disabled,
    opacity: 0.68,
  },
  primaryActionLabel: {
    color: captureColors.onAccent,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryActionPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  secondaryActionDisabled: {
    opacity: 0.56,
  },
  secondaryActionLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  destructiveAction: {
    alignItems: "center",
    backgroundColor: captureColors.critical,
    borderRadius: captureRadii.small,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  destructiveActionPressed: {
    opacity: 0.86,
  },
  destructiveActionDisabled: {
    opacity: 0.56,
  },
  destructiveActionLabel: {
    color: captureColors.onAccent,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  fieldGroup: {
    gap: captureSpacing.xsmall,
  },
  fieldLabel: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  field: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldError: {
    borderColor: captureColors.critical,
  },
  dateAction: {
    alignItems: "center",
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateActionValue: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  dateActionHint: {
    color: captureColors.accent,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  errorText: {
    color: captureColors.critical,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionRow: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: "transparent",
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    minHeight: 48,
    padding: 16,
  },
  selectionRowSelected: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
    borderWidth: 2,
  },
  selectionLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  selectionDetail: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    padding: 16,
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
    backgroundColor: captureColors.surface,
  },
  noticeTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  noticeText: {
    color: captureColors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCriticalText: {
    color: captureColors.critical,
  },
  noticeWarningText: {
    color: captureColors.warningInk,
  },
  noticeSuccess: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  noticeSuccessText: {
    color: captureColors.accent,
  },
});
