"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { verifyCustomerPin } from '@/lib/customer-auth'
import { useAuth } from '@/contexts/auth-context'

export default function SignInPage() {
    const [pin, setPin] = useState(['', '', '', ''])
    const [phone, setPhone] = useState('')
    const [showForgotPinMessage, setShowForgotPinMessage] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [error, setError] = useState('')
    const [rememberPhone, setRememberPhone] = useState(false)
    const router = useRouter()
    const { customerSignIn } = useAuth()
    const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

    // Auto-hide forgot pin message after 8 seconds
    useEffect(() => {
        if (showForgotPinMessage) {
            const timer = setTimeout(() => {
                setShowForgotPinMessage(false)
            }, 8000)
            return () => clearTimeout(timer)
        }
    }, [showForgotPinMessage])

    // Load remembered phone number on mount
    useEffect(() => {
        const rememberedPhone = localStorage.getItem('rememberedPhone')
        if (rememberedPhone) {
            setPhone(rememberedPhone)
            setRememberPhone(true)
        }
    }, [])

    // Check if form is complete
    const formComplete = pin.every(digit => digit !== '') && phone.length === 11

    // Auto-login when form is complete
    useEffect(() => {
        if (formComplete && !error) {
            verifyAndLogin()
        }
    }, [formComplete, phone, pin])

    // Handle login
    const verifyAndLogin = async () => {
        if (!formComplete) return
        
        setIsLoading(true)
        setError('')
        
        try {
            // Verify credentials with Firebase
            const isValid = await verifyCustomerPin(phone, pin.join(''))
            
            if (isValid) {
                // Remember phone number if checkbox is checked
                if (rememberPhone) {
                    localStorage.setItem('rememberedPhone', phone)
                } else {
                    localStorage.removeItem('rememberedPhone')
                }
                
                // Set global auth state
                customerSignIn(phone)
                
                // Switch to signing in state
                setIsLoading(false)
                setIsSigningIn(true)
                
                // Wait 4 seconds then redirect
                setTimeout(() => {
                    router.push('/')
                }, 4000)
            } else {
                setError('Invalid phone number or PIN')
                // Clear PIN on wrong attempt
                setPin(['', '', '', ''])
                // Focus first PIN input
                inputRefs[0].current?.focus()
                setIsLoading(false)
            }
            
        } catch (error) {
            console.error('Login error:', error)
            setError('Login failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Signing in overlay */}
            {isSigningIn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                        <p className="text-lg text-white font-semibold">Signing in...</p>
                    </div>
                </div>
            )}

            <section className={`flex min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 ${isSigningIn ? 'blur-sm' : ''}`}>
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
                        <h2 className="text-3xl font-light mb-4 text-center">Welcome Back</h2>
                        <p className="text-lg text-white/80 text-center max-w-md font-light">
                            Sign in to your account to continue shopping for premium products with exclusive deals and fast delivery.
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
                            <h2 className="text-2xl font-light text-slate-900 mb-2">Welcome Back</h2>
                            <p className="text-slate-600">Sign in to continue shopping</p>
                        </div>
                        
                        <form
                            action=""
                            className="space-y-6">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 shadow-lg">
                                {/* Desktop Header */}
                                <div className="hidden lg:block text-center mb-8">
                                    <h3 className="text-2xl font-light text-slate-900 mb-2">Welcome Back</h3>
                                    <p className="text-slate-600">Sign in to continue shopping</p>
                                </div>

                                <div className="space-y-6">
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-red-700 text-sm">{error}</p>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="phone"
                                            className="block text-sm font-medium text-slate-700">
                                            Phone number
                                        </Label>
                                        <Input
                                            type="tel"
                                            required
                                            name="phone"
                                            id="phone"
                                            maxLength={11}
                                            placeholder="Enter phone number"
                                            className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white/50"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            onKeyPress={(e) => {
                                                if (!/[0-9]/.test(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            value={phone}
                                            onChange={(e) => {
                                                setPhone(e.target.value)
                                                // Clear error when user starts typing
                                                if (error) setError('')
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-3">
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
                                                        
                                                        // Clear error when user starts typing
                                                        if (error) setError('')
                                                        
                                                        const newPin = [...pin]
                                                        newPin[index] = value
                                                        setPin(newPin)
                                                        
                                                        // Auto-focus next input if current is filled
                                                        if (value && index < 3) {
                                                            inputRefs[index + 1].current?.focus()
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

                                        <div className="flex items-center space-x-2 mt-4">
                                            <input
                                                type="checkbox"
                                                id="rememberPhone"
                                                checked={rememberPhone}
                                                onChange={(e) => setRememberPhone(e.target.checked)}
                                                className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                                            />
                                            <Label htmlFor="rememberPhone" className="text-sm text-slate-700">
                                                Remember phone number
                                            </Label>
                                        </div>
                                        
                                        <div className="flex justify-end mt-6">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => setShowForgotPinMessage(true)}
                                                className="text-slate-600 hover:text-slate-900 text-sm">
                                                Forgot pin?
                                            </Button>
                                        </div>
                                        
                                        {showForgotPinMessage && (
                                            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-start space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <svg className="w-5 h-5 text-slate-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-semibold text-slate-900 mb-1">Account Recovery</h4>
                                                        <p className="text-sm text-slate-700 leading-relaxed">
                                                            Contact our support team at{' '}
                                                            <a 
                                                                href="mailto:chuzzyenoch@gmail.com?subject=PIN Reset Request&body=I need help resetting my PIN for my account."
                                                                className="font-medium text-slate-600 hover:text-slate-700 underline transition-colors"
                                                            >
                                                                chuzzyenoch@gmail.com
                                                            </a>
                                                            {' '}to reset your PIN after identity verification.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-200">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-10 text-sm font-medium text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all"
                                                        onClick={() => window.location.href = 'mailto:chuzzyenoch@gmail.com?subject=PIN Reset Request&body=I need help resetting my PIN for my account.'}
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        Contact Support
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Loading indicator */}
                                    {isLoading && (
                                        <div className="flex justify-center items-center">
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700 mr-2"></div>
                                                <p className="text-sm text-slate-600">Verifying...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-slate-600 text-sm">
                                    Don't have an account?{' '}
                                    <Link 
                                        href="/customersignup" 
                                        className="text-slate-900 hover:text-slate-700 font-medium transition-colors">
                                        Register
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
