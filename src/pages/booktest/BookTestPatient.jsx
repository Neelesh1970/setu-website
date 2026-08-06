import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useBookTest } from "../../context/BookTestContext"
import {
  addAddress,
  checkPincode,
  listAddresses,
  setDefaultAddress,
} from "../../api/booktest"
import BookTestShell, { BookTestPrimaryButton } from "../../components/booktest/BookTestShell"
import { productCode } from "../../utils/booktest"

const ACCENT = "#7C3AED"

export default function BookTestPatient() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { cartItems, setFlow } = useBookTest()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [form, setForm] = useState({
    name: session?.first_name || "",
    gender: "MALE",
    age: "",
    email: "",
    phone: session?.mobile || "",
    pincode: "",
    houseNumber: "",
    addressLine2: "",
    addressType: "home",
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const list = await listAddresses(session, session.user_id)
        if (cancelled) return
        setAddresses(list || [])
        const def =
          list?.find((a) => a.isDefault || a.is_default) || list?.[0]
        if (def) {
          setSelectedAddressId(String(def.addressId || def.id))
          // Auto-fill form with default address
          fillFormWithAddress(def)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load addresses")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session])

  // Function to fill form with address data
  const fillFormWithAddress = (address) => {
    if (!address) return
    setForm(prev => ({
      ...prev,
      name: address.recipientName || address.name || prev.name,
      phone: address.phoneNumber || address.phone || prev.phone,
      pincode: address.pincode || prev.pincode,
      houseNumber: address.houseNumber || prev.houseNumber,
      addressLine2: address.addressLine2 || prev.addressLine2,
    }))
  }

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const continueWithAddress = (address) => {
    const items = cartItems.map((it) => ({ id: productCode(it) })).filter((x) => x.id)
    if (!items.length) {
      setError("Cart is empty. Add a package first.")
      return
    }
    if (!form.name.trim() || !form.age || !form.phone) {
      setError("Name, age and mobile are required.")
      return
    }
    
    // Set the flow data
    setFlow({
      patient: {
        name: form.name.trim(),
        gender: form.gender,
        age: Number(form.age),
        ageType: "YEAR",
        email: form.email.trim(),
        contactNumber: form.phone.trim(),
      },
      address: address,
      cartProductCodes: items,
    })
    
    // Navigate to slots page
    navigate("/app/book-tests/slots")
  }

  const handleContinueExisting = async () => {
    setError("")
    
    // Find the selected address
    const address = addresses.find(
      (a) => String(a.addressId || a.id) === String(selectedAddressId),
    )
    
    if (!address) {
      setError("Select an address or add a new one.")
      return
    }
    
    // Validate patient details
    if (!form.name.trim() || !form.age || !form.phone) {
      setError("Name, age and mobile are required.")
      return
    }
    
    try {
      // Set default address (non-blocking)
      await setDefaultAddress(session, {
        userId: session.user_id,
        addressId: address.addressId || address.id,
      })
    } catch {
      /* non-blocking */
    }
    
    // Continue with the selected address
    continueWithAddress(address)
  }

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id)
    const selectedAddress = addresses.find(
      (a) => String(a.addressId || a.id) === String(id)
    )
    if (selectedAddress) {
      fillFormWithAddress(selectedAddress)
    }
  }

  const handleAddAndContinue = async (e) => {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const pin = String(form.pincode).trim()
      if (!/^\d{6}$/.test(pin)) throw new Error("Enter a valid 6-digit pincode")
      const ok = await checkPincode(session, pin)
      if (!ok) throw new Error("Home collection is not available for this pincode")

      const saved = await addAddress(session, {
        user_id: session.user_id,
        pincode: pin,
        houseNumber: form.houseNumber.trim(),
        recipientName: form.name.trim(),
        phoneNumber: form.phone.trim(),
        addressType: "home",
        addressLine2: form.addressLine2.trim(),
      })
      
      // Create address object with proper structure
      const address = {
        addressId: saved?.addressId || saved?.id || saved?.address?.addressId,
        id: saved?.id || saved?.addressId || saved?.address?.id,
        pincode: pin,
        houseNumber: form.houseNumber.trim(),
        recipientName: form.name.trim(),
        phoneNumber: form.phone.trim(),
        addressLine2: form.addressLine2.trim(),
        isDefault: false,
      }
      
      // Add to addresses list and select it
      const updatedAddresses = [...addresses, address]
      setAddresses(updatedAddresses)
      setSelectedAddressId(String(address.addressId || address.id))
      setShowNewAddressForm(false)
      
      // Navigate to slots with the new address
      continueWithAddress(address)
    } catch (err) {
      setError(err.message || "Could not save address")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <BookTestShell title="Patient details" backTo="/app/book-tests/cart">
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-violet-700" />
        </div>
      </BookTestShell>
    )
  }

  return (
    <BookTestShell title="Patient details" backTo="/app/book-tests/cart">
      <div className="space-y-5">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="rounded-3xl border border-violet-100 bg-white p-5">
          <h2 className="font-semibold text-setu-charcoal">Patient</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-setu-muted">Name</span>
              <input
                className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-setu-muted">Gender</span>
              <select
                className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-setu-muted">Age</span>
              <input
                type="number"
                min="1"
                max="120"
                className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-setu-muted">Mobile</span>
              <input
                className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-setu-muted">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </label>
          </div>
        </div>

        {addresses.length > 0 && (
          <div className="rounded-3xl border border-violet-100 bg-white p-5">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Select address</h2>
              <button
                type="button"
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium"
              >
                {showNewAddressForm ? "Cancel" : "+ Add New"}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {addresses.map((a) => {
                const id = String(a.addressId || a.id)
                const isSelected = selectedAddressId === id
                return (
                  <div
                    key={id}
                    className={`flex cursor-pointer gap-3 rounded-2xl border px-3 py-3 text-sm ${
                      isSelected
                        ? "border-violet-500 bg-violet-50"
                        : "border-violet-100 hover:border-violet-300"
                    }`}
                    onClick={() => handleAddressSelect(id)}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={isSelected}
                      onChange={() => handleAddressSelect(id)}
                      className="mt-1"
                    />
                    <span>
                      <strong>{a.recipientName || a.name || "Address"}</strong>
                      <br />
                      {[a.houseNumber, a.addressLine2, a.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4">
              <BookTestPrimaryButton onClick={handleContinueExisting}>
                Continue with selected address
              </BookTestPrimaryButton>
            </div>
          </div>
        )}

        {(showNewAddressForm || addresses.length === 0) && (
          <form
            onSubmit={handleAddAndContinue}
            className="rounded-3xl border border-violet-100 bg-white p-5"
          >
            <h2 className="font-semibold">
              {addresses.length ? "Add new address" : "Collection address"}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-setu-muted">Pincode</span>
                <input
                  className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  maxLength={6}
                  required
                />
              </label>
              <label className="text-sm">
                <span className="text-setu-muted">House / Flat</span>
                <input
                  className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                  value={form.houseNumber}
                  onChange={(e) => update("houseNumber", e.target.value)}
                  required
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-setu-muted">Landmark / Area</span>
                <input
                  className="mt-1 w-full rounded-xl border border-violet-100 px-3 py-2"
                  value={form.addressLine2}
                  onChange={(e) => update("addressLine2", e.target.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? "Saving…" : "Save address & continue"}
            </button>
          </form>
        )}
      </div>
    </BookTestShell>
  )
}