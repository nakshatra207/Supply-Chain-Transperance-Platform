import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";
import Timeline from "../components/Timeline.jsx";
import { useLanguage } from "../LanguageContext.jsx";

export default function Trace() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState("");
  const { t, lang } = useLanguage();

  useEffect(() => {
    api
      .get(`/api/trace/${batchId}`)
      .then(({ data }) => {
        setBatch(data.batch);
        setDisclaimer(data.disclaimer);
      })
      .catch((err) => setError(err.response?.data?.error || t("trace.notFound")));
  }, [batchId, t]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-stone-500 mt-2">{t("batch.batchId")}: {batchId}</p>
      </div>
    );
  }
  if (!batch) return <p className="max-w-2xl mx-auto px-4 py-16 text-stone-500 text-center">{t("trace.loading")}</p>;

  const isVerified = !!batch.certificateHash;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium">
          {t("trace.badge")}
        </span>
        <h1 className="text-3xl font-bold text-stone-900 mt-3">{batch.productName}</h1>
        <p className="text-stone-500 text-sm mt-1">{t("batch.batchId")}: {batch.batchId}</p>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <Info label={t("batch.crop")} value={batch.cropType} />
        <Info label={t("batch.location")} value={batch.farmLocation} />
        <Info
          label={t("batch.harvestDate")}
          value={new Date(batch.harvestDate).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US")}
        />
        <Info label={t("batch.quantity")} value={`${batch.quantity} ${batch.unit}`} />
        <Info label={t("batch.farmer")} value={batch.farmer?.name || "—"} />
        <Info
          label={t("trace.certStatus")}
          value={
            isVerified ? (
              <span className="text-leaf-700 font-medium">{t("trace.certVerified")}</span>
            ) : (
              <span className="text-amber-600">{t("trace.certPending")}</span>
            )
          }
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900 text-center">{t("trace.timelineTitle")}</h2>
      <div className="mt-6 max-w-xl mx-auto">
        <Timeline batch={batch} />
      </div>

      <div className="mt-10 text-xs text-stone-500 max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
        {lang === "hi" ? t("footer.disclaimer") : disclaimer || t("footer.disclaimer")}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-stone-500 text-xs">{label}</p>
      <div className="text-stone-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}
