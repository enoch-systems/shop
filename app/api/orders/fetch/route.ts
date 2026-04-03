import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, where, DocumentData } from 'firebase/firestore'

interface Order {
  id: string
  [key: string]: any
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userPhone = searchParams.get('userPhone')
    const status = searchParams.get('status') // optional filter: cancelled, successful, pending

    if (!userPhone) {
      return NextResponse.json(
        { error: 'Missing required parameter: userPhone' },
        { status: 400 }
      )
    }

    // Create a reference to the user's orders subcollection
    const userOrdersRef = collection(db, 'users', userPhone, 'orders')
    
    // Build query
    let q = query(userOrdersRef, orderBy('createdAt', 'desc'))
    
    // Add status filter if provided
    if (status && status !== 'all') {
      q = query(q, where('status', '==', status))
    }

    // Execute the query
    const querySnapshot = await getDocs(q)
    const orders: Order[] = querySnapshot.docs.map((doc: DocumentData) => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      orders: orders,
      count: orders.length
    })

  } catch (error) {
    console.error('Error fetching orders from Firestore:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
