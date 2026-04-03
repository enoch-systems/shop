"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { saveCustomerData, checkPhoneExists } from '@/lib/customer-auth'
import { useAuth } from '@/contexts/auth-context'

export default function LoginPage() {
    const [pin, setPin] = useState(['', '', '', ''])
    const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
    const [phone, setPhone] = useState('')
    const [showConfirmPin, setShowConfirmPin] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [phoneError, setPhoneError] = useState('')
    const [success, setSuccess] = useState(false)
    const [isCheckingPhone, setIsCheckingPhone] = useState(false)
    const router = useRouter()
    const { customerSignIn } = useAuth()
    const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
    const confirmInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

    // Get the redirect URL from query params or localStorage
    const getRedirectUrl = () => {
        // Check if there's a redirect parameter in the URL
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const redirectFrom = urlParams.get('redirect')
            
            // Check localStorage for saved redirect URL
            const savedRedirect = localStorage.getItem('redirectAfterSignup')
            
            // Prioritize URL parameter, then localStorage, then default to checkout
            return redirectFrom || savedRedirect || '/checkout'
        }
        return '/checkout'
    }

    // Check if we should show confirm PIN
    useEffect(() => {
        const pinComplete = pin.every(digit => digit !== '')
        const phoneComplete = phone.length === 11
        setShowConfirmPin(pinComplete && phoneComplete)
    }, [pin, phone])

    // Check phone number in real-time
    const checkPhoneInRealTime = async (phoneNumber: string) => {
        if (phoneNumber.length === 11) {
            setIsCheckingPhone(true)
            setPhoneError('')
            try {
                const phoneExists = await checkPhoneExists(phoneNumber)
                if (phoneExists) {
                    setPhoneError('This phone number is already registered')
                }
            } catch (error) {
                console.error('Error checking phone:', error)
            } finally {
                setIsCheckingPhone(false)
            }
        } else {
            setPhoneError('')
        }
    }

    // Check if pins match
    const pinsMatch = pin.join('') === confirmPin.join('') && pin.every(digit => digit !== '')

    // Auto-focus first confirm PIN box when it appears
    useEffect(() => {
        if (showConfirmPin) {
            setTimeout(() => {
                confirmInputRefs[0].current?.focus()
            }, 100)
        }
    }, [showConfirmPin])

    // Handle registration
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!pinsMatch) {
            setError('PINs do not match')
            return
        }
        
        setIsLoading(true)
        setError('')
        
        try {
            // Check if phone already exists
            const phoneExists = await checkPhoneExists(phone)
            if (phoneExists) {
                setError('Phone number already registered')
                return
            }
            
            // Save customer data to Firebase
            await saveCustomerData(phone, pin.join(''))
            
            // Auto-login after successful registration
            customerSignIn(phone)
            
            setSuccess(true)
            setTimeout(() => {
                // Get the redirect URL and clear localStorage
                const redirectUrl = getRedirectUrl()
                localStorage.removeItem('redirectAfterSignup')
                router.push(redirectUrl)
            }, 1500)
            
        } catch (error) {
            console.error('Registration error:', error)
            setError('Registration failed. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <>
            <section className="flex min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                {/* Left Side - Image/Brand Section */}
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900">
                        <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    <div className="relative z-10 flex flex-col justify-center items-center h-full p-12 text-white">
                        <div className="mb-8">
                            <div className="flex items-center justify-center space-x-3 mb-6">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <span className="text-2xl font-light">QuickShop</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-light mb-4 text-center">Join QuickShop</h2>
                        <p className="text-lg text-white/80 text-center max-w-md font-light">
                            Create your account and start shopping for premium products with exclusive deals and fast delivery.
                        </p>
                        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                            <div>
                                <div className="text-2xl font-semibold mb-2">50K+</div>
                                <div className="text-sm text-white/70">Happy Customers</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold mb-2">1000+</div>
                                <div className="text-sm text-white/70">Premium Products</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold mb-2">24/7</div>
                                <div className="text-sm text-white/70">Customer Support</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form Section */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
                    {/* Mobile Back to Home Button - Top Left */}
                    <div className="lg:hidden absolute top-4 left-4">
                        <Link
                            href="/"
                            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors group p-2"
                        >
                            <svg
                                className="w-5 h-5 transform transition-transform group-hover:-translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                    </div>
                    
                    <div className="w-full max-w-md">
                        {/* Mobile Brand Header */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="flex items-center justify-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-semibold">QuickShop</span>
                            </div>
                            <h2 className="text-2xl font-light text-slate-900 mb-2">Create Account</h2>
                            <p className="text-slate-600">Join us for exclusive deals</p>
                        </div>
                        
                        <form
                            onSubmit={handleRegister}
                            className="space-y-6">
                            {/* Error Popup Message */}
                            {error && (
                                <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg transform transition-all duration-300 ease-in-out">
                                    <div className="max-w-md mx-auto text-center">
                                        <p className="font-medium">{error}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 shadow-lg">
                                {/* Desktop Header */}
                                <div className="hidden lg:block text-center mb-8">
                                    <h3 className="text-2xl font-light text-slate-900 mb-2">Create Account</h3>
                                    <p className="text-slate-600">Join us for exclusive deals</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="phone"
                                            className="block text-sm font-medium text-slate-700">
                                            Phone number
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="tel"
                                                required
                                                name="phone"
                                                id="phone"
                                                maxLength={11}
                                                placeholder="e.g 09162919586"
                                                className={`h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white/50 pr-10 ${
                                                    phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                                                }`}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                onKeyPress={(e) => {
                                                    if (!/[0-9]/.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                value={phone}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    setPhone(value)
                                                    checkPhoneInRealTime(value)
                                                    
                                                    // Auto-focus first PIN box when phone number is complete (11 digits)
                                                    if (value.length === 11 && !phoneError) {
                                                        setTimeout(() => {
                                                            inputRefs[0].current?.focus()
                                                        }, 100)
                                                    }
                                                }}
                                            />
                                            {isCheckingPhone && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                                                </div>
                                            )}
                                            {phoneError && !isCheckingPhone && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        {phoneError && (
                                            <p className="text-red-600 text-sm mt-1">{phoneError}</p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-red-700 text-sm">{error}</p>
                                            </div>
                                        )}
                                        
                                        {success && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-green-700 text-sm">Registration successful! Auto-logging in...</p>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <Label
                                                htmlFor="pwd"
                                                className="block text-sm font-medium text-slate-700 mb-3">
                                                Pin
                                            </Label>
                                            <div className="flex gap-3 justify-center">
                                                {[0, 1, 2, 3].map((index) => (
                                                    <Input
                                                        key={index}
                                                        ref={inputRefs[index]}
                                                        type="text"
                                                        maxLength={1}
                                                        required
                                                        className="w-14 h-14 text-center text-xl font-semibold border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white/50"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={pin[index]}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            if (!/[0-9]/.test(value) && value !== '') {
                                                                e.preventDefault()
                                                                return
                                                            }
                                                            
                                                            const newPin = [...pin]
                                                            newPin[index] = value
                                                            setPin(newPin)
                                                            
                                                            // Auto-focus next input if current is filled
                                                            if (value && index < 3) {
                                                                inputRefs[index + 1].current?.focus()
                                                            }
                                                            
                                                            // Auto-focus first confirm PIN when last PIN digit is filled
                                                            if (value && index === 3) {
                                                                setTimeout(() => {
                                                                    confirmInputRefs[0].current?.focus()
                                                                }, 100)
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Handle backspace to go to previous field
                                                            if (e.key === 'Backspace' && !pin[index] && index > 0) {
                                                                inputRefs[index - 1].current?.focus()
                                                            }
                                                            // Prevent non-numeric keys
                                                            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete') {
                                                                e.preventDefault()
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-medium text-slate-700 mb-3">
                                                Confirm Pin
                                            </Label>
                                            <div className="flex gap-3 justify-center">
                                                {[0, 1, 2, 3].map((index) => (
                                                    <Input
                                                        key={index}
                                                        ref={confirmInputRefs[index]}
                                                        type="text"
                                                        maxLength={1}
                                                        required
                                                        className={`w-14 h-14 text-center text-xl font-semibold border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white/50 ${
                                                            pin.every(digit => digit !== '') 
                                                                ? '' 
                                                                : 'opacity-50 cursor-not-allowed bg-slate-100'
                                                        }`}
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={confirmPin[index]}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            if (!/[0-9]/.test(value) && value !== '') {
                                                                e.preventDefault()
                                                                return
                                                            }

                                                            // Prevent input if first PIN is not complete
                                                            if (!pin.every(digit => digit !== '')) {
                                                                e.preventDefault()
                                                                return
                                                            }

                                                            const newPin = [...confirmPin]
                                                            newPin[index] = value
                                                            setConfirmPin(newPin)

                                                            // Check for PIN mismatch when user starts typing confirm PIN
                                                            if (value) {
                                                                const tempConfirmPin = [...confirmPin]
                                                                tempConfirmPin[index] = value
                                                                const isComplete = tempConfirmPin.every(digit => digit !== '')
                                                                const isMismatch = isComplete && pin.join('') !== tempConfirmPin.join('')
                                                                
                                                                if (isMismatch) {
                                                                    setError('PINs do not match')
                                                                    // Clear error after 3 seconds
                                                                    setTimeout(() => setError(''), 3000)
                                                                } else if (isComplete && !isMismatch) {
                                                                    setError('') // Clear error if they match
                                                                }
                                                            }

                                                            // Auto-focus next input if current is filled
                                                            if (value && index < 3) {
                                                                confirmInputRefs[index + 1].current?.focus()
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Prevent input if first PIN is not complete
                                                            if (!pin.every(digit => digit !== '')) {
                                                                e.preventDefault()
                                                                return
                                                            }

                                                            // Handle backspace to go to previous field
                                                            if (e.key === 'Backspace' && !confirmPin[index] && index > 0) {
                                                                confirmInputRefs[index - 1].current?.focus()
                                                            }
                                                            // Handle Enter key to submit form on last field
                                                            if (e.key === 'Enter' && index === 3 && confirmPin[index] && pinsMatch) {
                                                                const formEvent = new Event('submit', { cancelable: true }) as any
                                                                handleRegister(formEvent)
                                                            }
                                                            // Prevent non-numeric keys
                                                            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete' && e.key !== 'Enter') {
                                                                e.preventDefault()
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            // Auto-focus first PIN if confirm PIN is clicked before first PIN is complete
                                                            if (!pin.every(digit => digit !== '')) {
                                                                e.preventDefault()
                                                                inputRefs[0].current?.focus()
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {!pin.every(digit => digit !== '') && (
                                                <p className="text-xs text-slate-500 text-center mt-2">Complete PIN first</p>
                                            )}
                                        </div>
                                    </div>

                                    <Button 
                                        type="submit"
                                        className={`w-full h-12 text-base font-light transition-all duration-300 ${
                                            pinsMatch && !phoneError && !isCheckingPhone
                                                ? 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white shadow-lg hover:shadow-xl' 
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                        disabled={!pinsMatch || isLoading || !!phoneError || isCheckingPhone}
                                    >
                                        {isLoading ? 'Creating account...' : isCheckingPhone ? 'Checking phone...' : 'Create Account'}
                                    </Button>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-slate-600 text-sm">
                                    Already have an account?{' '}
                                    <Link 
                                        href="/customersignin" 
                                        className="text-slate-900 hover:text-slate-700 font-medium transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </>
    )
}
