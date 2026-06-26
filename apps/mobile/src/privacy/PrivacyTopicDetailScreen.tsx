import { ScrollView, StyleSheet, Text, View } from "react-native";
import { privacyTopicParagraphs, type PrivacyTopicContent } from "@validade-zero/contracts";
import { captureColors, captureRadii, captureSpacing } from "../capture/capture-theme";
import { ScreenHeader, SecondaryAction } from "../capture/capture-ui";

export function PrivacyTopicDetailScreen({
  topic,
  privacyContact,
  onBack,
}: {
  topic: PrivacyTopicContent;
  privacyContact?: string | null;
  onBack: () => void;
}) {
  const paragraphs = privacyTopicParagraphs(topic, privacyContact);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>{topic.tag}</Text>
        <ScreenHeader title={topic.title} body={topic.summary} />
        <SecondaryAction label="Voltar ao centro de privacidade" onPress={onBack} />
      </View>

      <View style={styles.body}>
        {paragraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.note}>
          <Text style={styles.noteText}>{topic.detail}</Text>
        </View>
      </View>

      <SecondaryAction label="Voltar ao centro de privacidade" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  hero: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  heroTag: {
    color: captureColors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  body: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  paragraph: {
    color: captureColors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  note: {
    backgroundColor: captureColors.surfaceMuted,
    borderRadius: captureRadii.small,
    padding: captureSpacing.medium,
  },
  noteText: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
