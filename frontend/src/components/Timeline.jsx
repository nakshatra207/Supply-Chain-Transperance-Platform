import React from "react";
import { useLanguage } from "../LanguageContext.jsx";

const EVENT_LABELS = {
  RECEIVED_BY_PROCESSOR: "Received by Processor",
  PROCESSING_STARTED: "Processing Started",
  PROCESSING_COMPLETED: "Processing Completed",
  PACKAGED: "Packaged & Quality Inspected",
  RECEIVED_BY_DISTRIBUTOR: "Received by Distributor",
  DISPATCHED: "Shipment Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED_TO_RETAILER: "Delivered to Retailer",
  RECEIVED_BY_RETAILER: "Received by Retailer",
  AVAILABLE_FOR_SALE: "Available on Retail Shelf",
};

function ChainBadge({ status, txHash, t }) {
  if (status === "CONFIRMED") {
    return (
      <div className="text-xs">
        <span className="text-leaf-700 font-medium">{t("timeline.onChainVerified")}</span>
        {txHash && <p className="text-stone-400 font-mono mt-0.5 break-all">{txHash}</p>}
      </div>
    );
  }
  return <span className="text-xs text-amber-600 font-medium">{t("timeline.pendingChain")}</span>;
}

export default function Timeline({ batch }) {
  const { t, lang } = useLanguage();

  const getEventTitle = (eventType) => {
    return t(`event.${eventType}`, EVENT_LABELS[eventType] || eventType);
  };

  const items = [
    {
      key: "created",
      title: t("timeline.batchCreated"),
      actor: batch.farmer?.name || t("timeline.farmer"),
      date: batch.createdAt,
      status: batch.chainStatus,
      txHash: batch.chainTxHash,
    },
    ...(batch.events || []).map((e) => ({
      key: e.id,
      title: getEventTitle(e.eventType),
      actor: e.participant?.name || t("timeline.participant"),
      location: e.location,
      date: e.createdAt,
      status: e.chainStatus,
      txHash: e.chainTxHash,
    })),
  ];

  return (
    <ol className="relative border-l-2 border-leaf-200 ml-2">
      {items.map((item) => (
        <li key={item.key} className="mb-8 ml-6">
          <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-leaf-500 ring-4 ring-white" />
          <h4 className="font-semibold text-stone-900">{item.title}</h4>
          <p className="text-sm text-stone-500">
            {item.actor}
            {item.location ? ` · ${item.location}` : ""} ·{" "}
            {new Date(item.date).toLocaleString(lang === "hi" ? "hi-IN" : "en-US")}
          </p>
          <div className="mt-1">
            <ChainBadge status={item.status} txHash={item.txHash} t={t} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export { EVENT_LABELS };
