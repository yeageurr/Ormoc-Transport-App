import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateDriver } from "../../api/usersAPI";

const inputClass = "mt-1.5 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2.5 text-sm text-[#203f4f] outline-none focus:border-[#168dff]";

export default function EditDriverDetailsModal({ driver, onClose, onSuccess }) {
  const [licenseNumber, setLicenseNumber] = useState(driver.license_num ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(driver.license_expiry?.slice(0, 10) ?? "");
  const [plateNumber, setPlateNumber] = useState(driver.vehicle_plate_number?.toUpperCase() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasVehicle = Boolean(driver.vehicle_plate_number);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!licenseNumber.trim() || !licenseExpiry || (hasVehicle && !plateNumber.trim())) {
      setError("Complete all license and assigned vehicle fields.");
      return;
    }

    const payload = {
      license_num: licenseNumber.trim(),
      license_expiry: new Date(`${licenseExpiry}T00:00:00`).toISOString(),
    };
    if (hasVehicle) payload.vehicle_plate_number = plateNumber.trim().toUpperCase();

    setSaving(true);
    try {
      await updateDriver(driver.user_id, payload);
      await onSuccess();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError.message || "Unable to save driver details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#173b4e]/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-driver-title" className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-[#f5fbff] p-6 shadow-[0_18px_55px_rgba(10,44,63,0.24)] sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-driver-title" className="m-0 text-xl font-semibold text-[#173b4e]">Edit Driver Details</h2>
            <div className="mt-1.5 h-[2px] w-[60px] bg-[#168dff]" />
            <p className="mb-0 mt-3 text-sm text-[#647c87]">{driver.first_name} {driver.last_name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-md border-0 bg-transparent p-1.5 text-[#52636b] hover:bg-[#e5f2f7] disabled:opacity-50"><X size={20} /></button>
        </div>

        <p className="mb-5 rounded-md bg-[#eaf6fb] px-3 py-2.5 text-xs leading-relaxed text-[#526f7c]">Administrators can update license and vehicle plate details here. Drivers manage their own contact and personal details.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-medium text-[#405f6d]">Driver license number
            <input className={inputClass} value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} maxLength={13} required />
          </label>
          <label className="block text-xs font-medium text-[#405f6d]">License expiry date
            <input className={inputClass} type="date" value={licenseExpiry} onChange={(event) => setLicenseExpiry(event.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-[#405f6d]">Vehicle plate number
            <input className={`${inputClass} uppercase disabled:bg-[#f1f5f7] disabled:text-[#83949b]`} value={plateNumber} onChange={(event) => setPlateNumber(event.target.value.toUpperCase())} maxLength={8} placeholder={hasVehicle ? "Plate number" : "No vehicle assigned"} disabled={!hasVehicle} />
          </label>
          {error ? <p role="alert" className="m-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-[#becbd1] bg-white px-4 py-2 text-sm font-medium text-[#405f6d] hover:bg-[#f4f9fb] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md border border-[#0876db] bg-[#168dff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0876db] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
