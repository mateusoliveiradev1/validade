import { useMemo, useState } from "react";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  calculateLotRisk,
  type CategoryRuleProfile,
  type ProductMode,
  type ProductRuleOverride,
  type RiskCalculationLot,
  type RiskWindows,
} from "@validade-zero/domain";
import type { OperationalLocation } from "@validade-zero/contracts";
import type { CaptureProductRecord, CaptureRepository } from "./repository";
import {
  captureCopy,
  formatLocation,
  formatOperationalTime,
  lotRegisteredCopy,
  operationalLocations,
  productLotFlowCopy,
  productModeLabels,
  requiredFieldError,
} from "./capture-copy";
import {
  DatePickerAction,
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
  type StatusNoticeTone,
} from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { mobileStatusDescriptorFor } from "./mobile-status";
import { centralStateLabel } from "./RecentLotList";

const LOCAL_ACTOR_LABEL = "Colaborador local";

export function LotRegistrationScreen({
  repository,
  product,
  onBack,
  onSaved,
}: {
  repository: CaptureRepository;
  product: CaptureProductRecord;
  onBack: () => void;
  onSaved?: () => void;
}) {
  const mode = product.productRuleOverride?.mode ?? product.categoryRuleProfile.mode;
  const [printedIdentity, setPrintedIdentity] = useState("");
  const [generatedIdentity, setGeneratedIdentity] = useState<string | undefined>();
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState<OperationalLocation | undefined>();
  const [customLocationName, setCustomLocationName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [qualityWindowDays, setQualityWindowDays] = useState("");
  const [saveError, setSaveError] = useState<string | undefined>();
  const [savedMessage, setSavedMessage] = useState<string | undefined>();

  const resolvedLocation = resolveLocation(location, customLocationName);
  const approximateQuantity = parseNonNegativeQuantity(quantity);
  const identityValue = generatedIdentity ?? printedIdentity.trim();
  const hasRequiredDates =
    ((mode === "formal_validity" || mode === "processed_repack_loss") && isIsoDate(expiresAt)) ||
    (mode === "flv_inspection" && isIsoDate(receivedAt) && isPositiveInteger(qualityWindowDays)) ||
    (mode === "receiving_monitored" && isIsoDate(receivedAt));
  const canSave =
    identityValue.length > 0 &&
    approximateQuantity !== undefined &&
    resolvedLocation !== undefined &&
    hasRequiredDates;
  const riskAssessment = useMemo(
    () => calculatePreview(product, mode, identityValue, expiresAt, receivedAt, qualityWindowDays),
    [expiresAt, identityValue, mode, product, qualityWindowDays, receivedAt],
  );
  const saveConsequence = lotSaveConsequence(product);

  function generateInternalIdentity(): void {
    setGeneratedIdentity(`INTERNO-LOCAL-${Date.now().toString(36).toUpperCase()}`);
    setPrintedIdentity("");
  }

  async function saveLot(): Promise<void> {
    if (!canSave || approximateQuantity === undefined || resolvedLocation === undefined) {
      setSaveError("Revise os campos destacados antes de registrar este lote.");
      return;
    }

    try {
      const lot = buildLotInput({
        productId: product.id,
        mode,
        identityValue,
        generatedIdentity,
        approximateQuantity,
        location: resolvedLocation,
        expiresAt,
        receivedAt,
        qualityWindowDays,
      });
      const snapshot = await repository.saveLot({ lot, actorLabel: LOCAL_ACTOR_LABEL });
      setSavedMessage(
        [
          lotRegisteredCopy(
            formatLocation(snapshot.currentObservation.location),
            formatOperationalTime(snapshot.currentObservation.occurredAt),
          ),
          centralStateLabel(snapshot),
          snapshot.centralAcknowledgementMessage,
        ]
          .filter((message): message is string => message !== undefined && message.length > 0)
          .join(" "),
      );
      setSaveError(undefined);
      onSaved?.();
    } catch (error) {
      setSaveError(lotSaveErrorMessage(error));
    }
  }

  function resetForAnotherLot(): void {
    setPrintedIdentity("");
    setGeneratedIdentity(undefined);
    setQuantity("");
    setLocation(undefined);
    setCustomLocationName("");
    setExpiresAt("");
    setReceivedAt("");
    setQualityWindowDays("");
    setSaveError(undefined);
    setSavedMessage(undefined);
  }

  if (savedMessage !== undefined) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader title="Lote registrado" body={product.displayName} />
        <StatusNotice>{savedMessage}</StatusNotice>
        <Text style={styles.metadata}>Registro atribuído a: {LOCAL_ACTOR_LABEL}</Text>
        <PrimaryAction label={captureCopy.repeatLot} onPress={resetForAnotherLot} />
        <SecondaryAction label={captureCopy.backAndReview} onPress={onBack} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={captureCopy.registerLot} body={productLotFlowCopy.lotRegistrationBody} />
      <View style={styles.productSummary}>
        <Text style={styles.productName}>{product.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {product.categoryId}</Text>
        <Text style={styles.metadata}>Perfil: {productModeLabels[mode]}</Text>
      </View>
      {product.reviewStatus === "pending_review" ? (
        <StatusNotice title={productLotFlowCopy.draftProductTitle} tone="warning">
          {productLotFlowCopy.draftProductBody}
        </StatusNotice>
      ) : null}
      <Field
        label="Identificação impressa do lote"
        value={printedIdentity}
        onChangeText={(value) => {
          setPrintedIdentity(value);
          setGeneratedIdentity(undefined);
        }}
        error={
          identityValue.length === 0 ? requiredFieldError("a identificação do lote") : undefined
        }
      />
      <SecondaryAction label={captureCopy.internalIdentity} onPress={generateInternalIdentity} />
      {generatedIdentity === undefined ? null : (
        <StatusNotice>
          Identificação interna: {generatedIdentity}. Não é código do fornecedor.
        </StatusNotice>
      )}
      <Field
        label="Quantidade aproximada"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        error={
          approximateQuantity === undefined
            ? requiredFieldError("a quantidade aproximada")
            : undefined
        }
      />
      <Text style={styles.sectionLabel}>Local inicial</Text>
      <View style={styles.locationList}>
        {operationalLocations.map((option) => (
          <SelectionRow
            key={option.kind}
            label={option.label}
            selected={location?.kind === option.kind}
            onPress={() => setLocation({ kind: option.kind } as OperationalLocation)}
          />
        ))}
      </View>
      {location?.kind === "other" ? (
        <Field
          label="Nome do outro local"
          value={customLocationName}
          onChangeText={setCustomLocationName}
          error={
            resolveLocation(location, customLocationName) === undefined
              ? requiredFieldError("o nome do outro local")
              : undefined
          }
        />
      ) : null}
      {resolvedLocation === undefined ? (
        <Text style={styles.errorText}>{requiredFieldError("o local inicial")}</Text>
      ) : null}
      {mode === "formal_validity" || mode === "processed_repack_loss" ? (
        <DateField label="Data de validade" value={expiresAt} onChangeText={setExpiresAt} />
      ) : null}
      {mode === "processed_repack_loss" ||
      mode === "flv_inspection" ||
      mode === "receiving_monitored" ? (
        <DateField label="Data de recebimento" value={receivedAt} onChangeText={setReceivedAt} />
      ) : null}
      {mode === "flv_inspection" ? (
        <Field
          label="Janela de qualidade (dias)"
          value={qualityWindowDays}
          onChangeText={setQualityWindowDays}
          keyboardType="numeric"
          error={
            isPositiveInteger(qualityWindowDays)
              ? undefined
              : requiredFieldError("a janela de qualidade")
          }
        />
      ) : null}
      <StatusNotice title="Previa de risco" tone={riskPreviewTone(riskAssessment.state)}>
        Avaliacao operacional: {riskAssessment.state}. Proxima orientacao: {riskAssessment.command}.
      </StatusNotice>
      <StatusNotice tone={saveConsequence.tone} title={saveConsequence.label}>
        {saveConsequence.body}
      </StatusNotice>
      {saveError === undefined ? null : <StatusNotice tone="error">{saveError}</StatusNotice>}
      <PrimaryAction
        label={captureCopy.registerLot}
        disabled={!canSave}
        onPress={() => void saveLot()}
      />
      <SecondaryAction label={captureCopy.backAndReview} onPress={onBack} />
    </ScrollView>
  );
}

function DateField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const valid = isIsoDate(value);
  const [touched, setTouched] = useState(false);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const selectedDate = valid ? fromIsoDate(value) : new Date();

  function updateDate(_event: DateTimePickerChangeEvent, nextDate: Date): void {
    onChangeText(toIsoDate(nextDate));
  }

  function openPicker(): void {
    setTouched(true);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: "date",
        display: "calendar",
        onValueChange: updateDate,
      });
      return;
    }

    setIosPickerVisible(true);
  }

  return (
    <View style={styles.dateGroup}>
      <DatePickerAction
        label={label}
        value={valid ? formatShortDate(value) : "Selecionar data"}
        onPress={openPicker}
        error={touched && !valid ? requiredFieldError(label.toLocaleLowerCase("pt-BR")) : undefined}
      />
      {valid ? <Text style={styles.metadata}>Prévia: {formatLongDate(value)}</Text> : null}
      {iosPickerVisible ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          onValueChange={updateDate}
          onDismiss={() => setIosPickerVisible(false)}
        />
      ) : null}
    </View>
  );
}

function fromIsoDate(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  return new Date(year, month - 1, day, 12);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function resolveLocation(
  location: OperationalLocation | undefined,
  customLocationName: string,
): OperationalLocation | undefined {
  if (location === undefined) {
    return undefined;
  }

  if (location.kind !== "other") {
    return location;
  }

  return customLocationName.trim().length === 0
    ? undefined
    : { kind: "other", customName: customLocationName };
}

function parseNonNegativeQuantity(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function isPositiveInteger(value: string): boolean {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function riskPreviewTone(state: string): "critical" | "warning" | "neutral" {
  if (state === "expired" || state === "critical") {
    return "critical";
  }

  if (state === "markdown" || state === "radar") {
    return "warning";
  }

  return "neutral";
}

function lotSaveConsequence(product: CaptureProductRecord): {
  tone: StatusNoticeTone;
  label: string;
  body: string;
} {
  if (product.reviewStatus === "pending_review") {
    const pending = mobileStatusDescriptorFor("pending_central");

    return {
      tone: pending.tone,
      label: pending.label,
      body: "Cadastro do produto em revisao central. O lote pode sincronizar, mas o produto ainda precisa ser validado.",
    };
  }

  if (product.centralProductId !== undefined || product.catalogSource === "central") {
    const synced = mobileStatusDescriptorFor("synced_transport");

    return {
      tone: synced.tone,
      label: synced.label,
      body: "Depois de registrar, confira o retorno central. Sincronizacao nao remove bloqueio operacional sozinha.",
    };
  }

  const local = mobileStatusDescriptorFor("local_only");

  return {
    tone: local.tone,
    label: local.label,
    body: local.body,
  };
}

function calculatePreview(
  product: CaptureProductRecord,
  mode: ProductMode,
  identityValue: string,
  expiresAt: string,
  receivedAt: string,
  qualityWindowDays: string,
) {
  const categoryProfile: CategoryRuleProfile = {
    categoryId: product.categoryRuleProfile.categoryId,
    mode: product.categoryRuleProfile.mode,
    ...(product.categoryRuleProfile.windows === undefined
      ? {}
      : { windows: toRiskWindows(product.categoryRuleProfile.windows) }),
    ...(product.categoryRuleProfile.maxPhysicalConfirmationAgeHours === undefined
      ? {}
      : {
          maxPhysicalConfirmationAgeHours:
            product.categoryRuleProfile.maxPhysicalConfirmationAgeHours,
        }),
  };
  const productOverride: ProductRuleOverride | undefined =
    product.productRuleOverride === undefined
      ? undefined
      : {
          productId: product.id,
          ...(product.productRuleOverride.mode === undefined
            ? {}
            : { mode: product.productRuleOverride.mode }),
          ...(product.productRuleOverride.windows === undefined
            ? {}
            : { windows: toRiskWindows(product.productRuleOverride.windows) }),
          ...(product.productRuleOverride.maxPhysicalConfirmationAgeHours === undefined
            ? {}
            : {
                maxPhysicalConfirmationAgeHours:
                  product.productRuleOverride.maxPhysicalConfirmationAgeHours,
              }),
        };
  const lotCode = identityValue.length === 0 ? "IDENTIFICACAO-PENDENTE" : identityValue;
  const lot: RiskCalculationLot =
    mode === "formal_validity" || mode === "processed_repack_loss"
      ? { mode, productId: product.id, lotCode, ...(isIsoDate(expiresAt) ? { expiresAt } : {}) }
      : mode === "flv_inspection"
        ? {
            mode,
            productId: product.id,
            lotCode,
            ...(isIsoDate(receivedAt) ? { receivedAt } : {}),
            ...(isPositiveInteger(qualityWindowDays)
              ? { qualityWindowDays: Number(qualityWindowDays) }
              : {}),
          }
        : {
            mode,
            productId: product.id,
            lotCode,
            ...(isIsoDate(receivedAt) ? { receivedAt } : {}),
          };

  return calculateLotRisk({
    currentDate: new Date().toISOString().slice(0, 10),
    categoryProfile,
    ...(productOverride === undefined ? {} : { productOverride }),
    lot,
  });
}

function toRiskWindows(input: {
  radarDays?: number | undefined;
  markdownDays?: number | undefined;
  criticalDays?: number | undefined;
  expiredDays?: number | undefined;
  qualityWindowDays?: number | undefined;
}): Partial<RiskWindows> {
  return {
    ...(input.radarDays === undefined ? {} : { radarDays: input.radarDays }),
    ...(input.markdownDays === undefined ? {} : { markdownDays: input.markdownDays }),
    ...(input.criticalDays === undefined ? {} : { criticalDays: input.criticalDays }),
    ...(input.expiredDays === undefined ? {} : { expiredDays: input.expiredDays }),
    ...(input.qualityWindowDays === undefined
      ? {}
      : { qualityWindowDays: input.qualityWindowDays }),
  };
}

function buildLotInput({
  productId,
  mode,
  identityValue,
  generatedIdentity,
  approximateQuantity,
  location,
  expiresAt,
  receivedAt,
  qualityWindowDays,
}: {
  productId: string;
  mode: ProductMode;
  identityValue: string;
  generatedIdentity: string | undefined;
  approximateQuantity: number;
  location: OperationalLocation;
  expiresAt: string;
  receivedAt: string;
  qualityWindowDays: string;
}) {
  const base = {
    productId,
    identity: {
      identitySource:
        generatedIdentity === undefined ? ("printed" as const) : ("generated_internal" as const),
      value: identityValue,
    },
    approximateQuantity,
    initialLocation: location,
  };

  if (mode === "formal_validity" || mode === "processed_repack_loss") {
    return {
      ...base,
      mode,
      expiresAt,
      ...(isIsoDate(receivedAt) ? { receivedAt } : {}),
    };
  }

  if (mode === "flv_inspection") {
    return { ...base, mode, receivedAt, qualityWindowDays: Number(qualityWindowDays) };
  }

  return { ...base, mode, receivedAt };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  productSummary: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    padding: captureSpacing.large,
  },
  productName: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  locationList: {
    gap: captureSpacing.small,
  },
  dateGroup: {
    gap: captureSpacing.xsmall,
  },
  errorText: {
    color: captureColors.critical,
    fontSize: 14,
    lineHeight: 20,
  },
});

function lotSaveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "central_lot_requires_ready_prepare_turn") {
    return "Prepare o turno novamente antes de registrar lote. Nada foi salvo apenas neste aparelho.";
  }

  if (error instanceof Error && error.message === "central_lot_requires_central_product") {
    return "Este produto ainda nao esta confirmado na central. Reabra o cadastro do produto antes de registrar lote.";
  }

  if (error instanceof Error && error.message === "central_lot_write_failed") {
    return "Nao foi possivel confirmar este lote na central. Nada foi salvo apenas neste aparelho; tente novamente.";
  }

  return "Nao foi possivel registrar este lote neste aparelho. Revise os campos destacados e tente novamente.";
}
