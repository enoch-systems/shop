import { NextRequest, NextResponse } from 'next/server'
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ReceiptData {
  id: string
  transactionId: string
  customerEmail: string
  customerName: string
  customerPhone: string
  items: Array<{
    id: string
    name: string
    price: string
    quantity: number
    color?: string
    length?: string
  }>
  subtotal: number
  total: number
  currency: string
  paymentMethod: string
  status: string
  date: string
  shippingAddress: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
  }
  createdAt: string
  updatedAt: string
}

// POST - Save receipt
export async function POST(request: NextRequest) {
  try {
    const receiptData: ReceiptData = await request.json()
    
    console.log('POST /api/receipts called with data:', receiptData)
    
    if (!receiptData.transactionId || !receiptData.customerEmail) {
      console.error('Missing required fields:', { transactionId: receiptData.transactionId, customerEmail: receiptData.customerEmail })
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Attempting to save to Firestore...')

    try {
      const normalizedReceiptData = {
        ...receiptData,
        customerEmail: receiptData.customerEmail.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const receiptRef = doc(db, 'receipts', receiptData.transactionId)

      console.log('Firestore document reference created:', receiptRef.path)
      console.log('Data to save:', normalizedReceiptData)

      await setDoc(receiptRef, normalizedReceiptData)
      
      console.log('Document saved successfully to Firestore')
      
      return NextResponse.json({
        success: true,
        message: 'Receipt saved successfully',
        receiptId: receiptData.transactionId
      })
    } catch (firestoreError: any) {
      console.error('Firebase error saving receipt:', firestoreError)
      console.error('Error code:', firestoreError.code)
      console.error('Error message:', firestoreError.message)
      
      // Check if it's a permission error
      if (firestoreError.code === 'permission-denied') {
        console.error('Permission denied - check Firebase security rules')
        return NextResponse.json(
          { success: false, message: 'Database permission error. Please contact support.' },
          { status: 403 }
        )
      }
      
      throw firestoreError
    }

  } catch (error) {
    console.error('Error saving receipt:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save receipt' },
      { status: 500 }
    )
  }
}

// GET - Retrieve receipts for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get('customerEmail')
    const transactionId = searchParams.get('transactionId')

    try {
      if (transactionId) {
        // Get specific receipt
        const singleReceiptRef = doc(db, 'receipts', transactionId)
        const receiptSnap = await getDoc(singleReceiptRef)
        
        if (receiptSnap.exists()) {
          return NextResponse.json({
            success: true,
            receipt: receiptSnap.data()
          })
        } else {
          return NextResponse.json(
            { success: false, message: 'Receipt not found' },
            { status: 404 }
          )
        }
      } else if (customerEmail) {
        // Get all receipts for customer - include all order statuses
        const normalizedEmail = customerEmail.trim().toLowerCase()
        console.log('Fetching receipts for email:', normalizedEmail)
        
        const receiptsQuery = query(
          collection(db, 'receipts'),
          where('customerEmail', '==', normalizedEmail),
          orderBy('createdAt', 'desc')
        )
        
        const querySnapshot = await getDocs(receiptsQuery)
        const receipts = querySnapshot.docs.map(doc => doc.data())
        
        console.log('Query returned', receipts.length, 'receipts for email:', normalizedEmail)
        
        return NextResponse.json({
          success: true,
          receipts,
          count: receipts.length
        })
      } else {
        return NextResponse.json(
          { success: false, message: 'Missing customerEmail or transactionId parameter' },
          { status: 400 }
        )
      }
    } catch (firestoreError: any) {
      console.error('Firebase error fetching receipts:', firestoreError)
      
      // Check if it's a permission error
      if (firestoreError.code === 'permission-denied') {
        return NextResponse.json(
          { success: false, message: 'Database permission error. Please contact support.' },
          { status: 403 }
        )
      }
      
      throw firestoreError
    }

  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}
