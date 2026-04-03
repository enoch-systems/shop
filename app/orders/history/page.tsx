'use client'

import React from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Package, Download, ChevronLeft, ChevronDown } from 'lucide-react'
import { HeroHeader } from '@/components/header'

export default function OrderHistory() {
  const { user, isCustomer } = useAuth()
  const router = useRouter()
  const [cancelledIds, setCancelledIds] = React.useState<Array<{ transactionId: string; total: number; date: string; status: string }>>([])
  const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    // Only load orders if user is logged in
    if (!user || !('phone' in user)) {
      setCancelledIds([])
      return
    }

    setIsLoading(true)
    const fetchOrders = async () => {
      try {
        const userPhone = user.phone
        const response = await fetch(`/api/orders/fetch?userPhone=${encodeURIComponent(userPhone)}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Fetched orders for user', userPhone, ':', data.orders)
          
          // Transform the data to match the expected format
          const transformedOrders = data.orders.map((order: any) => ({
            transactionId: order.transactionId || order.id,
            total: order.total || 0,
            date: order.date || new Date(order.createdAt?.toDate?.() || Date.now()).toISOString().split('T')[0],
            status: order.status || 'cancelled'
          }))
          
          setCancelledIds(transformedOrders)
        } else {
          console.error('Failed to fetch orders:', response.statusText)
          setCancelledIds([])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
        setCancelledIds([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [user])

  // Auto-expand all months by default when orders are loaded
  React.useEffect(() => {
    if (cancelledIds.length > 0) {
      const groups: Set<string> = new Set()
      cancelledIds.forEach((order: any) => {
        if (order.transactionId) {
          try {
            const parts = order.transactionId.split('-')
            if (parts.length >= 2) {
              const timestamp = parseInt(parts[1])
              const date = new Date(timestamp)
              const monthKey = date.toLocaleString('en-US', { month: 'short' }).slice(0, 3)
              groups.add(monthKey)
            }
          } catch (e) {
            console.error('Error parsing date:', e)
          }
        }
      })
      setExpandedMonths(groups)
    }
  }, [cancelledIds])

  const toggleMonth = (monthLabel: string) => {
    const newSet = new Set(expandedMonths)
    if (newSet.has(monthLabel)) {
      newSet.delete(monthLabel)
    } else {
      newSet.add(monthLabel)
    }
    setExpandedMonths(newSet)
  }

  // Parse transaction ID to get timestamp
  const getTransactionDate = (transactionId: string | undefined) => {
    try {
      if (!transactionId) return null
      // Transaction ID format: TX-{timestamp}-{randomString}
      const parts = transactionId.split('-')
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1])
        return new Date(timestamp)
      }
    } catch (e) {
      console.error('Error parsing transaction date:', e)
    }
    return null
  }

  // Group transactions by month
  const groupedByMonth = React.useMemo(() => {
    const groups: { [key: string]: typeof cancelledIds } = {}
    
    cancelledIds.forEach((order) => {
      if (!order.transactionId) return
      const date = getTransactionDate(order.transactionId)
      if (date) {
        const monthKey = date.toLocaleString('en-US', { month: 'short' }).slice(0, 3)
        if (!groups[monthKey]) groups[monthKey] = []
        groups[monthKey].push(order)
      }
    })
    
    // Sort orders by date in descending order within each month
    Object.keys(groups).forEach(monthKey => {
      groups[monthKey].sort((a, b) => {
        const dateA = getTransactionDate(a.transactionId)
        const dateB = getTransactionDate(b.transactionId)
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB.getTime() - dateA.getTime() // Descending order (newest first)
      })
    })
    
    return groups
  }, [cancelledIds])

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <HeroHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600 [&>svg]:stroke-[2.5]" />
          </button>
          <h1 className="text-2xl font-light text-gray-900 flex-1 text-center">Order History</h1>
          <div className="flex-shrink-0 w-10"></div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order history...</p>
          </div>
        ) : cancelledIds.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="size-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-light text-gray-900 mb-2">No order history</h2>
            <p className="text-gray-600 mb-6">You have no order history yet.</p>
            <button
              onClick={() => router.push('/shop')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-lg font-light transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Month grouped transactions */}
            {Object.entries(groupedByMonth).map(([monthLabel, orders]) => {
              const totalOut = orders.reduce((sum, order) => sum + order.total, 0)
              
              return (
                <div key={monthLabel}>
                {/* Month header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="relative">
                      <button 
                        onClick={() => toggleMonth(monthLabel)}
                        className="flex items-center gap-2 text-gray-900 hover:text-slate-700 font-light"
                      >
                        {monthLabel} 
                        <svg 
                          className={`w-4 h-4 transition-transform duration-300 ease-in-out ${expandedMonths.has(monthLabel) ? 'rotate-180' : ''}`}
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                        >
                          <path d="M12 16L4 8h16l-8 8z" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="text-slate-700 font-light">Cancelled -₦{totalOut.toLocaleString()}</span>
                      <span className="mx-2">|</span>
                      <span className="text-slate-700 font-light">Paid ₦0.00</span>
                    </div>
                  </div>
                </div>

                {/* Transaction items for this month - only show if expanded */}
                {expandedMonths.has(monthLabel) && orders.map((order) => {
                  const date = getTransactionDate(order.transactionId)
                  const timeString = date ? date.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit'
                  }) : 'Unknown time'
                  
                  return (
                    <div key={order.transactionId} className="bg-white border-b border-slate-200 px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-light text-gray-900">Order Cancelled</p>
                            <p className="text-sm text-gray-500">{timeString}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-light text-slate-700">-₦{order.total.toLocaleString()}</p>
                          <span className="inline-block text-xs font-light px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 mt-1">
                            Cancelled
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto mb-4"></div>
            <p className="text-white">Loading order history...</p>
          </div>
        </div>
      )}
    </div>
  )
}
