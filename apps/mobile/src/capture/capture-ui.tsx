import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

const colors = {
  dominant: "#F5F7EF",
  secondary: "#E6EEE4",
  ink: "#112016",
  mutedInk: "#3F5546",
  accent: "#166534",
  onAccent: "#FFFFFF",
  critical: "#B42318",
} as const;

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
      style={[styles.primaryAction, disabled ? styles.primaryActionDisabled : undefined]}
    >
      <Text style={styles.primaryActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.secondaryAction}
    >
      <Text style={styles.secondaryActionLabel}>{label}</Text>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
  keyboardType?: KeyboardTypeOptions | undefined;
  editable?: boolean | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedInk}
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
}: {
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, tone === "error" ? styles.noticeError : undefined]}
    >
      <Text style={[styles.noticeText, tone === "error" ? styles.noticeErrorText : undefined]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  body: {
    color: colors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionDisabled: {
    backgroundColor: colors.mutedInk,
  },
  primaryActionLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.ink,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryActionLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  field: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.mutedInk,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldError: {
    borderColor: colors.critical,
  },
  dateAction: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.mutedInk,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateActionValue: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  dateActionHint: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  errorText: {
    color: colors.critical,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionRow: {
    backgroundColor: colors.secondary,
    minHeight: 48,
    padding: 16,
  },
  selectionRowSelected: {
    backgroundColor: "#D5E7D9",
    borderColor: colors.accent,
    borderWidth: 2,
  },
  selectionLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  selectionDetail: {
    color: colors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    backgroundColor: colors.secondary,
    padding: 16,
  },
  noticeError: {
    backgroundColor: "#FCE8E6",
  },
  noticeText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeErrorText: {
    color: colors.critical,
  },
});
