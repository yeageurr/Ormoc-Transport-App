import { useEffect, useState } from "react";
import { X, UserPlus } from "lucide-react";
import { createDriver, getBorrowableVehicles } from "../../api/usersAPI";

const initialForm = {
  first_name: "", last_name: "", email: "", contact_number: "",
  license_num: "", license_expiry: "", plate_number: "", body_number: "",
  body_color: "#2684A8", vehicle_type: "Multicab", registry_expiration: "",
  vehicle_mode: "new", vehicle_id: "",
};

const inputClass = "w-full rounded-md border border-[#becbd1] bg-white px-3 py-2 text-sm text-[#203f4f] outline-none transition-colors placeholder:text-[#718792] focus:border-[#168dff]";
const labelClass = "block space-y-1.5 text-xs font-medium text-[#405f6d]";

export default function AddUserModal({ isOpen, onClose, onSuccess, onError }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [borrowableVehicles, setBorrowableVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState("");

  useEffect(() => {
    if (!isOpen || form.vehicle_mode !== "existing") return undefined;
    let cancelled = false;
    setIsLoadingVehicles(true);
    setVehicleLoadError("");
    getBorrowableVehicles()
      .then((vehicles) => { if (!cancelled) setBorrowableVehicles(vehicles); })
      .catch((err) => {
        if (!cancelled) setVehicleLoadError(err?.response?.data?.detail || err.message || "Could not load available vehicles.");
      })
      .finally(() => { if (!cancelled) setIsLoadingVehicles(false); });
    return () => { cancelled = true; };
  }, [isOpen, form.vehicle_mode]);

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "contact_number" ? value.replace(/\D/g, "").slice(0, 11) : value,
    }));
    setError("");
  };

  const validate = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return "Enter the driver's first and last name.";
    if (!/^\d{11}$/.test(form.contact_number)) return "Phone number must be exactly 11 digits.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(form.email.trim())) return "Enter a valid email address.";
    if (!form.license_num.trim() || !form.license_expiry) return "Driver's license number and expiry are required.";
    if (form.vehicle_mode === "existing") {
      if (!form.vehicle_id) return "Select an existing vehicle for this driver.";
      return "";
    }
    if (!form.plate_number.trim() || !form.body_number.trim() || !form.vehicle_type.trim() || !form.registry_expiration) return "Complete all vehicle details.";
    return "";
  };

  const goToCredentials = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setStep(1);
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const dateAsIso = (date) => new Date(`${date}T00:00:00+08:00`).toISOString();
      const driver = await createDriver({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        contact_number: form.contact_number,
        email: form.email.trim() || undefined,
        license_num: form.license_num.trim(),
        license_expiry: dateAsIso(form.license_expiry),
        ...(form.vehicle_mode === "existing" ? { vehicle_id: Number(form.vehicle_id) } : { vehicle: {
          plate_number: form.plate_number.trim().toUpperCase(),
          body_number: form.body_number.trim(),
          body_color: form.body_color,
          vehicle_type: form.vehicle_type.trim(),
          registry_expiration: dateAsIso(form.registry_expiration),
        } }),
      });
      setForm(initialForm);
      setStep(1);
      onSuccess(driver);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(", ")
        : err?.response?.data?.error?.message || detail || err.message || "Failed to create the driver account.";
      setError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    setForm(initialForm);
    setStep(1);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0c1f2a]/45 p-4">
      <section className="my-auto max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="add-driver-title">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e1edf1] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-[#0879ac]" />
            <div>
              <h2 id="add-driver-title" className="m-0 text-lg font-bold text-[#173b4e]">Add Driver and Vehicle</h2>
              <p className="mb-0 mt-1 text-xs text-[#718792]">Step {step} of 2 · {step === 1 ? "Driver and vehicle details" : "Account details"}</p>
            </div>
          </div>
          <button type="button" onClick={close} disabled={submitting} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border-0 bg-[#f2f8fa] text-[#506b77] transition-colors hover:bg-[#eaf7fc] disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 max-sm:p-4">
          {error && <div role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          {step === 1 ? <>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <label className={labelClass}>First name<input className={inputClass} name="first_name" value={form.first_name} onChange={updateField} autoComplete="given-name" maxLength={50} required /></label>
              <label className={labelClass}>Last name<input className={inputClass} name="last_name" value={form.last_name} onChange={updateField} autoComplete="family-name" maxLength={50} required /></label>
              <label className={labelClass}>Phone number<input className={inputClass} name="contact_number" value={form.contact_number} onChange={updateField} inputMode="numeric" autoComplete="tel" placeholder="09XXXXXXXXX" required />{form.contact_number.length > 0 && form.contact_number.length !== 11 && <span className="text-[11px] text-[#F0997B]">Phone number must be exactly 11 digits.</span>}</label>
              <label className={labelClass}>Email <span className="font-normal text-[#718792]">(optional)</span><input className={inputClass} type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" /></label>
              <label className={labelClass}>Driver's license number<input className={inputClass} name="license_num" value={form.license_num} onChange={updateField} maxLength={13} required /></label>
              <label className={labelClass}>License expiry<input className={inputClass} type="date" name="license_expiry" value={form.license_expiry} onChange={updateField} min={new Date().toISOString().slice(0, 10)} required /></label>
            </div>

            <div className="space-y-4 rounded-lg border border-[#d7e8ef] p-4">
              <div><h3 className="m-0 text-sm font-bold text-[#294a5b]">Vehicle details</h3><p className="mb-0 mt-1 text-xs text-[#718792]">Create a vehicle for this driver or assign one they are borrowing.</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setForm((current) => ({ ...current, vehicle_mode: "new", vehicle_id: "" })); setError(""); }} className={`h-[35px] rounded-md border px-3 text-xs font-semibold ${form.vehicle_mode === "new" ? "border-[#168dff] bg-[#eaf7fc] text-[#0879ac]" : "border-[#becbd1] bg-white text-[#526d79] hover:bg-[#f5fbff]"}`}>Add a new vehicle</button>
                <button type="button" onClick={() => { setForm((current) => ({ ...current, vehicle_mode: "existing" })); setError(""); }} className={`h-[35px] rounded-md border px-3 text-xs font-semibold ${form.vehicle_mode === "existing" ? "border-[#168dff] bg-[#eaf7fc] text-[#0879ac]" : "border-[#becbd1] bg-white text-[#526d79] hover:bg-[#f5fbff]"}`}>Pick an existing vehicle</button>
              </div>
              {form.vehicle_mode === "existing" ? (
                <div className="space-y-2">
                  <label className={labelClass}>Available vehicle
                    <select className={inputClass} value={form.vehicle_id} onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))} disabled={isLoadingVehicles || borrowableVehicles.length === 0}>
                      <option value="">{isLoadingVehicles ? "Loading vehicles…" : borrowableVehicles.length ? "Select a vehicle" : "No vehicles available to borrow"}</option>
                      {borrowableVehicles.map((vehicle) => <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>{vehicle.plate_number.toUpperCase()} · {vehicle.vehicle_type} · Owner: {vehicle.owner ? `${vehicle.owner.first_name} ${vehicle.owner.last_name}` : "Unknown"}</option>)}
                    </select>
                  </label>
                  {vehicleLoadError && <p role="alert" className="m-0 text-xs text-rose-700">{vehicleLoadError}</p>}
                  <p className="m-0 text-xs text-[#718792]">The vehicle owner remains unchanged. The vehicle will be linked to this driver as a borrower.</p>
                </div>
              ) : <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <label className={labelClass}>Plate number<input className={inputClass} name="plate_number" value={form.plate_number} onChange={updateField} maxLength={8} required /></label>
                <label className={labelClass}>Body number<input className={inputClass} name="body_number" value={form.body_number} onChange={updateField} maxLength={10} required /></label>
                <label className={labelClass}>Vehicle type<input className={inputClass} name="vehicle_type" value={form.vehicle_type} onChange={updateField} placeholder="e.g. Multicab" required /></label>
                <label className={labelClass}>Body color<span className="flex h-[38px] items-center gap-3 rounded-md border border-[#becbd1] bg-white px-2"><input className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" type="color" name="body_color" value={form.body_color} onChange={updateField} /><span className="text-xs text-[#405f6d]">{form.body_color.toUpperCase()}</span></span></label>
                <label className={`${labelClass} col-span-2 max-sm:col-span-1`}>Vehicle registration expiry<input className={inputClass} type="date" name="registry_expiration" value={form.registry_expiration} onChange={updateField} min={new Date().toISOString().slice(0, 10)} required /></label>
              </div>}
            </div>

            <div className="flex justify-end border-t border-[#e1edf1] pt-4"><button type="button" onClick={goToCredentials} className="h-[35px] rounded-md border-0 bg-[#168dff] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#0876db]">Next</button></div>
          </> : <>
            <div className="space-y-4 rounded-lg bg-[#f4f9fb] p-4">
              <div><h3 className="m-0 text-sm font-bold text-[#294a5b]">Account details</h3><p className="mb-0 mt-1 text-xs leading-relaxed text-[#647c87]">The driver's phone number is used as their login username and temporary password.</p></div>
              <label className={labelClass}>Login username<input className={`${inputClass} bg-[#f5f8f9]`} value={form.contact_number} readOnly /></label>
              <label className={labelClass}>Temporary password<span className="flex rounded-md border border-[#becbd1] bg-[#f5f8f9] focus-within:border-[#168dff]"><input className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-[#203f4f] outline-none" type={showPassword ? "text" : "password"} value={form.contact_number} readOnly /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="px-3 text-xs font-semibold text-[#0879ac]">{showPassword ? "Hide" : "Show"}</button></span></label>
              <p className="m-0 text-xs text-[#718792]">The driver must change this password before using the app.</p>
            </div>
            <div className="flex justify-between border-t border-[#e1edf1] pt-4"><button type="button" onClick={() => { setError(""); setStep(1); }} disabled={submitting} className="h-[35px] rounded-md border-0 bg-[#edf4f7] px-4 text-xs font-semibold text-[#34515f] hover:bg-[#dcecf2] disabled:opacity-50">Back</button><button type="submit" disabled={submitting} className="h-[35px] rounded-md border-0 bg-[#168dff] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#0876db] disabled:cursor-wait disabled:opacity-50">{submitting ? "Creating…" : "Create Driver"}</button></div>
          </>}
        </form>
      </section>
    </div>
  );
}
