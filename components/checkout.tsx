'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Plus, Minus, Trash2, ExternalLink, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroHeader } from './header'
import { useCart } from './cart-context'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { useAuth } from '@/contexts/auth-context'
import { getCustomerInfo, saveCustomerInfo } from '@/lib/customer-auth'
import { getAllProducts } from '@/lib/products'

// TypeScript declarations for Korapay
declare global {
  interface Window {
    Korapay?: {
      initialize: (options: {
        key: string
        reference: string
        amount: number
        currency: string
        customer: {
          name: string
          email: string
        }
        notification_url: string
        metadata: any
        onSuccess: (data: any) => void
        onFailed: (data: any) => void
        onClose: () => void
      }) => void
    }
  }
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
}

interface StateData {
  state: string
  cities: string[]
}

const Modal = ({ show, onClose, children, className = '' }: { show: boolean; onClose?: () => void; children: React.ReactNode; className?: string }) => {
  if (!show) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg p-6 max-w-md w-full ${className}`}>{children}</div>
      </div>
    </>
  )
}

const Checkout = () => {
  const { user, isCustomer } = useAuth()
  const router = useRouter()
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart: clearCartFromContext,
    updateCartPrices,
  } = useCart()

  // State Management
  const [showClearModal, setShowClearModal] = useState(false)
  const [showSaveInfoWarningModal, setShowSaveInfoWarningModal] = useState(false)
  const [isEditingCustomerInfo, setIsEditingCustomerInfo] = useState(false)
  const [isLoadingCustomerInfo, setIsLoadingCustomerInfo] = useState(true)
  const [hasSavedData, setHasSavedData] = useState<boolean | null>(null)
  const [nigeriaStatesAndCities, setNigeriaStatesAndCities] = useState<StateData[]>([])
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)
  const [popupMessage, setPopupMessage] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  })

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = Number(String(item.price).replace(/[^\d.-]/g, ''))
      return total + (Number.isNaN(price) ? 0 : price) * item.quantity
    }, 0)
  }, [cartItems])

  const areAllFieldsFilled = useMemo(() => {
    if (cartItems.length === 0) return false
    return Object.values(customerInfo).every(v => v.trim().length > 0)
  }, [customerInfo, cartItems])

  useEffect(() => {
    if (!user || !isCustomer) {
      setCustomerInfo({ name: '', email: '', phone: '', address: '', city: '', state: '' })
      localStorage.removeItem('customerInfo')
      setHasSavedData(false)
      setIsEditingCustomerInfo(false)
      setAvailableCities([])
    }
  }, [user, isCustomer])

  useEffect(() => {
    const fetchNigeria = async () => {
      try {
        const res = await fetch('/api/nigeria-states')
        const data = await res.json()
        if (data.success) setNigeriaStatesAndCities(data.data)
      } catch (e) {
        console.error('Failed to load states:', e)
      }
    }
    fetchNigeria()
  }, [])

  useEffect(() => {
    const loadCustomerInfo = async () => {
      try {
        if (!isCustomer || !user || !('phone' in user)) {
          setHasSavedData(false)
          setIsLoadingCustomerInfo(false)
          return
        }

        // Load from Firestore first
        const saved = await getCustomerInfo(user.phone)
        if (saved?.name && saved?.email && saved?.address && saved?.city && saved?.state) {
          setCustomerInfo({
            name: String(saved.name),
            email: String(saved.email),
            phone: String(user.phone),
            address: String(saved.address),
            city: String(saved.city),
            state: String(saved.state),
          })
          setHasSavedData(true)
          
          // Update localStorage as backup
          localStorage.setItem('customerInfo', JSON.stringify({
            name: String(saved.name),
            email: String(saved.email),
            phone: String(user.phone),
            address: String(saved.address),
            city: String(saved.city),
            state: String(saved.state),
          }))
        } else {
          setHasSavedData(false)
        }
      } catch (error) {
        console.error('Error loading customer info:', error)
        setHasSavedData(false)
      } finally {
        setIsLoadingCustomerInfo(false)
      }
    }

    loadCustomerInfo()
  }, [isCustomer, user])

  useEffect(() => {
    const handleProductChange = async () => {
      try {
        const currentProducts = await getAllProducts()
        const updated = currentProducts
          .filter(p => cartItems.some(i => i.id === p.id))
          .map(p => ({ id: p.id, price: p.price, originalPrice: p.originalPrice }))

        if (updated.length) updateCartPrices(updated)
      } catch (error) {
        console.error('Error updating cart prices:', error)
      }
    }

    window.addEventListener('productsChanged', handleProductChange)
    const interval = setInterval(() => {
      const lastUpdate = localStorage.getItem('productsUpdated')
      const lastChecked = localStorage.getItem('lastPriceCheck')
      if (lastUpdate && (!lastChecked || Number(lastUpdate) > Number(lastChecked))) {
        handleProductChange(); localStorage.setItem('lastPriceCheck', Date.now().toString())
      }
    }, 5000)

    return () => {
      window.removeEventListener('productsChanged', handleProductChange)
      clearInterval(interval)
    }
  }, [cartItems, updateCartPrices])

  const handleStateChange = useCallback((stateName: string) => {
    const selected = nigeriaStatesAndCities.find(s => s.state === stateName)
    setAvailableCities(selected?.cities || [])
    setCustomerInfo(prev => ({ ...prev, state: stateName, city: '' }))
  }, [nigeriaStatesAndCities])

  const handleInputChange = useCallback((field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => {
      const next = { ...prev, [field]: value }
      localStorage.setItem('customerInfo', JSON.stringify(next))
      return next
    })
  }, [])

  const saveCustomerInfoToFirestore = async () => {
    if (!user || !isCustomer || !('phone' in user)) {
      console.error('No authenticated customer found')
      return
    }

    try {
      await saveCustomerInfo(user.phone, {
        name: customerInfo.name,
        email: customerInfo.email,
        address: customerInfo.address,
        city: customerInfo.city,
        state: customerInfo.state
      }, true)
      console.log('Customer info saved to Firestore')
      setHasSavedData(true)
    } catch (error) {
      console.error('Error saving customer info to Firestore:', error)
    }
  }

  const showPopupMessage = (type: 'error' | 'success', message: string) => {
    setPopupMessage({ type, message })
    setTimeout(() => setPopupMessage(null), 5000) // Auto-hide after 5 seconds
  }

  const handlePayment = async () => {
    if (!areAllFieldsFilled) {
      setShowSaveInfoWarningModal(true)
      return
    }

    // Check if price exceeds limit (let's set limit to ₦350,000 based on the error)
    const MAX_AMOUNT = 350000
    if (subtotal > MAX_AMOUNT) {
      showPopupMessage('error', `Amount exceeds maximum limit of ₦${MAX_AMOUNT.toLocaleString()}. Please reduce your cart total to proceed.`)
      return
    }

    try {
      // Save customer info to Firestore before payment
      if (user && isCustomer && 'phone' in user) {
        await saveCustomerInfo(user.phone, {
          name: customerInfo.name,
          email: customerInfo.email,
          address: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state
        }, true)
        setHasSavedData(true)
      }

      // Generate unique transaction reference
      const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Store transaction details for verification
      const transactionData = {
        reference,
        amount: subtotal,
        customer: customerInfo,
        items: cartItems,
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem('pendingTransaction', JSON.stringify(transactionData))

      // Initialize Korapay payment with dynamic amount
      if (window.Korapay) {
        initializeKorapayPayment(reference)
      } else {
        // Load Korapay script if not already loaded
        const script = document.createElement('script')
        script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js'
        script.onload = () => {
          initializeKorapayPayment(reference)
        }
        script.onerror = () => {
          alert('Failed to load payment gateway. Please refresh the page and try again.')
        }
        document.head.appendChild(script)
      }
    } catch (error) {
      console.error('Payment initialization error:', error)
      alert('Unable to initialize payment. Please try again.')
    }
  }

  const saveCancelledOrder = async (reference: string) => {
    setIsCancellingOrder(true)
    try {
      const orderData = {
        userPhone: customerInfo.phone,
        transactionId: reference,
        total: subtotal,
        date: new Date().toISOString().split('T')[0],
        status: 'cancelled',
        paymentMethod: 'bank_transfer',
        items: cartItems,
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone
        },
        shippingAddress: {
          address: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state
        }
      }

      const response = await fetch('/api/orders/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        console.log('Cancelled order saved to history:', reference)
        // Clear the cart after successful save
        clearCartFromContext()
      } else {
        console.error('Failed to save cancelled order')
      }
    } catch (error) {
      console.error('Error saving cancelled order:', error)
    } finally {
      setIsCancellingOrder(false)
    }
  }

  const initializeKorapayPayment = (reference: string) => {
    if (!window.Korapay) {
      console.error('Korapay not loaded')
      return
    }

    window.Korapay.initialize({
      key: process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY || 'pk_test_your_korapay_public_key_here',
      reference: reference,
      amount: Math.round(subtotal), // Amount is already in correct format
      currency: "NGN",
      customer: {
        name: customerInfo.name,
        email: customerInfo.email
      },
      notification_url: `${window.location.origin}/api/korapay-webhook`,
      metadata: {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state}`.substring(0, 50),
        cart_total: subtotal
      },
      onSuccess: function(data: any) {
        console.log("Payment successful", data)
        // Verify payment on server side
        verifyPayment(data.reference)
      },
      onFailed: function(data: any) {
        console.log("Payment failed", data)
        alert(`Payment failed: ${data.message || 'Unknown error'}`)
      },
      onClose: function() {
        console.log("Payment modal closed")
        // Save cancelled order to order history
        saveCancelledOrder(reference)
      }
    })
  }

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch('/api/verify-korapay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data.status === 'success') {
        // Clear cart and redirect to success page
        clearCartFromContext()
        localStorage.removeItem('pendingTransaction')
        alert('Payment successful! Thank you for your order.')
        router.push('/order-success')
      } else {
        alert('Payment verification failed. Please contact support.')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      alert('Unable to verify payment. Please contact support if amount was deducted.')
    }
  }

  const confirmClearCart = () => {
    clearCartFromContext()
    setShowClearModal(false)
  }

  return (
    <>
      {/* <main className="min-h-screen  mk,l,bg-gradient-to-br from-slate-100 to-gray-300"> */}
      <HeroHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20">
          {/* Mobile-style Back Button */}
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-700 font-light mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4">
                  <h2 className="text-lg font-light">Your Cart ({cartItems.length} items)</h2>
                </div>
                
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-6">Your cart is empty</p>
                    <Link href="/shop">
                      <Button className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-lg px-6 py-3 font-light transition-all duration-300 shadow-lg hover:shadow-xl">
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <Link href={`/shop/${item.id}`} className="w-20 h-20 shrink-0 bg-white rounded-lg overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
                          <OptimizedImage src={item.image} alt={item.name} width={80} height={80} className="w-full h-full object-cover" sizes="80px" />
                        </Link>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link href={`/shop/${item.id}`} className="font-medium text-gray-900 hover:text-slate-700 transition-colors">{item.name}</Link>
                              <p className="text-slate-700 font-light text-lg mt-1">{item.price}</p>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id)} 
                              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {item.color && <p className="text-sm text-gray-600 mt-2">Color: {item.color}</p>}
                          {item.length && <p className="text-sm text-gray-600">Length: {item.length}</p>}
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                              <button 
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-green-50 text-green-600 transition-colors"
                              >
                                <Minus className="w-4 h-4"/>
                              </button>
                              <span className="w-10 text-center font-medium text-gray-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-green-50 text-green-600 transition-colors"
                              >
                                <Plus className="w-4 h-4"/>
                              </button>
                            </div>
                            <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info & Payment Section */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-white text-slate-900 p-4">
                  <h2 className="text-lg font-light flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer Information
                  </h2>
                </div>
                
                <div className="p-4">
                  {isLoadingCustomerInfo && user && hasSavedData === null ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto mb-4"></div>
                      <p className="text-slate-600 text-sm">Loading your information...</p>
                    </div>
                  ) : (
                    <>
                      {!user && (
                        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg p-6 mb-4 border border-slate-200">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                            </div>
                            <h3 className="text-lg font-light text-gray-900 mb-2">Create account with your mobile number</h3>
                            <p className="text-sm text-gray-600 mb-6 font-light">One minute to sign up and pay</p>
                            <button 
                              onClick={() => { localStorage.setItem('redirectAfterSignup', '/checkout'); window.location.href = '/customersignup' }} 
                              className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white font-light py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              Create Account & Continue
                            </button>
                          </div>
                        </div>
                      )}

                      {user && hasSavedData && !isEditingCustomerInfo && (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                            {[
                              ['Name', customerInfo.name], 
                              ['Email', customerInfo.email], 
                              ['Phone', customerInfo.phone], 
                              ['Address', customerInfo.address], 
                              ['Location', `${customerInfo.city}, ${customerInfo.state}`]
                            ].map(([label, value]) => (
                              <div key={label as string} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 font-medium">{label}:</span>
                                <span className="text-sm font-semibold text-gray-900">{value}</span>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => { setIsEditingCustomerInfo(true); setHasSavedData(false); setAvailableCities([]); setCustomerInfo(prev => ({ ...prev, state: '', city: '' })) }} 
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-700 font-light ml-auto cursor-pointer transition-colors"
                          >
                            <Edit className="w-4 h-4"/> Edit my info
                          </button>
                        </div>
                      )}
                      {(!user || (user && (!hasSavedData || isEditingCustomerInfo))) && (
                        <div className={`space-y-4 ${!user ? 'opacity-30 pointer-events-none' : ''}`}>
                          {[
                            { key:'name', label:"Receiver's Name", type:'text', placeholder:"Enter receiver's name" },
                            { key:'email', label:"Receiver's Email", type:'email', placeholder:"Enter receiver's email" },
                            { key:'phone', label:"Receiver's Phone Number", type:'tel', placeholder:"Enter receiver's phone number", maxLength:11, pattern:'[0-9]' },
                            { key:'address', label:"Receiver's Address", type:'text', placeholder:"Enter receiver's address" }
                          ].map(field => (
                            <div key={field.key}>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label} *</label>
                              <input 
                                type={field.type} 
                                value={customerInfo[field.key as keyof CustomerInfo]} 
                                onChange={e => handleInputChange(field.key as keyof CustomerInfo, e.target.value)} 
                                placeholder={field.placeholder} 
                                maxLength={field.maxLength} 
                                onKeyPress={field.pattern ? e => { if (!new RegExp(field.pattern!).test(e.key) && !['Backspace','Tab','Delete'].includes(e.key)) e.preventDefault() } : undefined} 
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                              />
                            </div>
                          ))}

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                              <select 
                                value={customerInfo.state} 
                                onChange={e => handleStateChange(e.target.value)} 
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                                disabled={!nigeriaStatesAndCities.length}
                              >
                                <option value="">{!nigeriaStatesAndCities.length ? 'Loading...' : 'Select state'}</option>
                                {nigeriaStatesAndCities.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                              <select 
                                value={customerInfo.city} 
                                onChange={e => handleInputChange('city', e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 transition-colors" 
                                disabled={!customerInfo.state}
                              >
                                <option value="">Select city</option>
                                {availableCities.map((city, index) => <option key={`${city}-${index}`} value={city}>{city}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button 
                              onClick={() => { setIsEditingCustomerInfo(false) }} 
                              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-light transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => { 
                                if (!areAllFieldsFilled) { 
                                  setShowSaveInfoWarningModal(true); 
                                  return 
                                }; 
                                await saveCustomerInfoToFirestore(); 
                                setIsEditingCustomerInfo(false); 
                              }} 
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-lg text-sm font-light transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700/1 to-slate-900/1 text-slate-900 p-4">
                  <h2 className="text-lg font-light flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Payment Summary
                  </h2>
                </div>
                
                <div className="p-4">
                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">₦{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Delivery</span>
                      <span className="text-slate-700 font-light">Free</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-slate-700">
                        ₦{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Maximum payment limit: ₦350,000</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={!areAllFieldsFilled || cartItems.length === 0}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-slate-800 hover:to-slate-950 disabled:from-gray-300 disabled:to-gray-400 text-white font-light py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Proceed to Payment
                  </button>
                  
                  {!areAllFieldsFilled && cartItems.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                      Please complete all customer information to proceed
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modals */}
      <Modal show={showClearModal} onClose={() => setShowClearModal(false)}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clear Cart</h3>
        <p className="text-gray-600 mb-6">Do you want to clear all items from your cart?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowClearModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            No
          </button>
          <button
            onClick={confirmClearCart}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Yes
          </button>
        </div>
      </Modal>

      <Modal
        show={showSaveInfoWarningModal}
        onClose={() => setShowSaveInfoWarningModal(false)}
        className="p-0 overflow-hidden"
      >
        <div className="text-center">
          {/* Header with gradient background */}
          <div className="bg-white p-4 text-white">
            <div className="w-16 h-16 bg-red-400/35 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/30">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-light text-red-400 mb-2">
              Complete Your Information
            </h3>
            <p className="text-red-400/80 text-sm">
              Please fill in all required customer information
            </p>
          </div>
          
          {/* Content section */}
          <div className="p-6 bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-5 mb-2 text-left space-y-1 border border-slate-200">
              {['Full name', 'Email address', 'Phone number', 'Delivery address', 'State and city'].map(
                (item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-1 h-1 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 bg-white border-t border-slate-200">
          <button
            onClick={() => setShowSaveInfoWarningModal(false)}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-light transition-colors"
          >
            I'll Fill It Later
          </button>
          <button
            onClick={() => setShowSaveInfoWarningModal(false)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-lg font-light transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Fill It Now
          </button>
        </div>
      </Modal>

      {/* Cancellation Loading Overlay */}
      {isCancellingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
            <p className="text-slate-700 font-medium">Cancelling order...</p>
            <p className="text-sm text-slate-500 text-center">Saving your cancelled order to history and clearing cart</p>
          </div>
        </div>
      )}

      {/* Popup Message */}
      {popupMessage && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          popupMessage.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {popupMessage.type === 'error' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{popupMessage.message}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default Checkout
