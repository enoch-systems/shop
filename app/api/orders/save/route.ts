import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'

interface OrderData {
  userPhone: string
  transactionId: string
  total?: number
  date?: string
  status?: string
  paymentMethod?: string
  items?: any[]
  customerInfo?: any
  shippingAddress?: any
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    
    // Validate required fields
    if (!orderData.userPhone || !orderData.transactionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userPhone and transactionId' },
        { status: 400 }
      )
    }

    // Create a reference to the user's orders subcollection
    const userOrdersRef = collection(db, 'users', orderData.userPhone, 'orders')
    const orderRef = doc(userOrdersRef, orderData.transactionId)

    // Prepare the order document
    const orderDocument = {
      transactionId: orderData.transactionId,
      total: orderData.total || 0,
      date: orderData.date || new Date().toISOString().split('T')[0],
      status: orderData.status || 'cancelled', // cancelled, successful, pending
      paymentMethod: orderData.paymentMethod || 'bank_transfer',
      items: orderData.items || [],
      customerInfo: orderData.customerInfo || {},
      shippingAddress: orderData.shippingAddress || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // Save the order to Firestore
    await setDoc(orderRef, orderDocument, { merge: true })

    return NextResponse.json({
      success: true,
      message: 'Order saved successfully',
      transactionId: orderData.transactionId
    })

  } catch (error) {
    console.error('Error saving order to Firestore:', error)
    return NextResponse.json(
      { error: 'Failed to save order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
