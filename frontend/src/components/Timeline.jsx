import React from "react";

const EVENT_LABELS = {
  RECEIVED_BY_PROCESSOR: "Received by Processor",
  PROCESSING_STARTED: "Processing Started",
  PROCESSING_COMPLETED: "Processing Completed",
  PACKAGED: "Packaged",
  RECEIVED_BY_DISTRIBUTOR: "Received by Distributor",
  DISPATCHED: "Shipment Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED_TO_RETAILER: "Delivered to Retailer",
  RECEIVED_BY_RETAILER: "Received by Retailer",
  AVAILABLE_FOR_SALE: "Available for Sale",
};

function ChainBadge({ status, txHash }) {
  if (status === "CONFIRMED") {
    return (
      <div className="text-xs">
        <span className="text-leaf-700 font-medium">✓ Recorded on blockchain</span>
        {txHash && <p className="text-stone-400 font-mono mt-0.5 break-all">{txHash}</p>}
      </div>
    );
  }
  return <span className="text-xs text-amber-600 font-medium">⚠ Not yet confirmed on-chain</span>;
}

export default function Timeline({ batch }) {
  const items = [
    {
      key: "created",
      title: "Batch Created",
      actor: batch.farmer?.name || "Farmer",
      date: batch.createdAt,
      status: batch.chainStatus,
      txHash: batch.chainTxHash,
    },
    ...(batch.events || []).map((e) => ({
      key: e.id,
      title: EVENT_LABELS[e.eventType] || e.eventType,
      actor: e.participant?.name || "Participant",
      location: e.location,
      date: e.createdAt,
      status: e.chainStatus,
      txHash: e.chainTxHash,
    })),
  ];

  return (
    <ol className="relative border-l-2 border-leaf-200 ml-2">
      {items.map((item, idx) => (
        <li key={item.key} className="mb-8 ml-6">
          <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-leaf-500 ring-4 ring-white" />
          <h4 className="font-semibold text-stone-900">{item.title}</h4>
          <p className="text-sm text-stone-500">
            {item.actor}
            {item.location ? ` · ${item.location}` : ""} · {new Date(item.date).toLocaleString()}
          </p>
          <div className="mt-1">
            <ChainBadge status={item.status} txHash={item.txHash} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export { EVENT_LABELS };
