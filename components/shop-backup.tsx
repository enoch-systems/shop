'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { HeroHeader } from './header'
import { useCart } from './cart-context'
import { useUI } from '@/contexts/ui-context'
import { Product, getAllProducts } from '@/lib/products'

const StarRating = ({ rating = 0 }: { rating?: number }) => {
    return (
        <div className="flex items-center gap-1">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{rating}</span>
        </div>
    )
}

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
                delay: 0.6,
            },
        },
    },
}

const Shop = () => {
    const { addToCart } = useCart()
    const { profileDropdownOpen, mobileMenuOpen } = useUI()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSort, setSelectedSort] = useState('Default')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [currentPage, setCurrentPage] = useState(1)
    const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // reference and positioning for the dropdown so we can render it
    // fixed on the page and above all other elements
    const searchWrapperRef = useRef<HTMLDivElement>(null)
    const [resultsStyle, setResultsStyle] = useState<{top: number; left: number; width: number} | null>(null)

    // Load products on component mount
    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true)
                setError(null)
                const productData = await getAllProducts()
                setProducts(productData)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load products')
            } finally {
                setLoading(false)
            }
        }

        loadProducts()
    }, [])

    // Listen for product updates from admin page
    useEffect(() => {
        const handleStorageChange = async () => {
            try {
                const productData = await getAllProducts()
                setProducts(productData)
            } catch (err) {
                console.error('Failed to reload products:', err)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('productsChanged', handleStorageChange)
        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('productsChanged', handleStorageChange)
        }
    }, [])

    // update stored settings on mount
    useEffect(() => {
        const savedSort = localStorage.getItem('selectedSort')
        if (savedSort) setSelectedSort(savedSort)
        const savedCat = localStorage.getItem('selectedCategory')
        if (savedCat) setSelectedCategory(savedCat)
    }, [])
    
    useEffect(() => {
        localStorage.setItem('selectedSort', selectedSort)
    }, [selectedSort])
    
    useEffect(() => {
        localStorage.setItem('selectedCategory', selectedCategory)
    }, [selectedCategory])

    // Reset to page 1 when sort changes
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedSort])

    // compute dropdown position whenever query changes or resize occurs
    useEffect(() => {
        if (!searchWrapperRef.current) return
        const rect = searchWrapperRef.current.getBoundingClientRect()
        setResultsStyle({
            top: rect.bottom + window.scrollY,
            left: rect.left + rect.width / 2 + window.scrollX,
            width: rect.width,
        })
    }, [searchQuery])

    // reposition on window resize as well
    useEffect(() => {
        const handler = () => {
            if (!searchWrapperRef.current) return
            const rect = searchWrapperRef.current.getBoundingClientRect()
            setResultsStyle({
                top: rect.bottom + window.scrollY,
                left: rect.left + rect.width / 2 + window.scrollX,
                width: rect.width,
            })
        }
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])

    const [productsPerPage, setProductsPerPage] = useState(12)
    const [isMobile, setIsMobile] = useState(false)
    const productsPerPageRef = useRef(productsPerPage)

    // Update products per page based on screen size
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            const newProductsPerPage = mobile ? 10 : 12
            
            if (newProductsPerPage !== productsPerPageRef.current) {
                productsPerPageRef.current = newProductsPerPage
                setProductsPerPage(newProductsPerPage)
                setCurrentPage(1) // Reset to first page when products per page changes
            }
            setIsMobile(mobile)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])
    const sortOptions = ['Default', 'Price: Low to High', 'Price: High to Low']
    const categories = ['All', 'Lace', 'Human Hair', 'Curly', 'Straight', 'Colored']

    // Calculate pagination
    const indexOfLastProduct = currentPage * productsPerPage
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage
    
    // Sort products to keep badged items at the top
    const sortProductsByBadge = (products: Product[]) => {
        const withBadge = products.filter(p => p.badge)
        const withoutBadge = products.filter(p => !p.badge)
        return [...withBadge, ...withoutBadge]
    }
    
    // Apply price sorting
    const applySorting = (productsToSort: Product[]) => {
        if (selectedSort === 'Price: Low to High') {
            return [...productsToSort].sort((a, b) => {
                const priceA = parseFloat(a.price?.toString().replace(/[^0-9.]/g, '') || '0')
                const priceB = parseFloat(b.price?.toString().replace(/[^0-9.]/g, '') || '0')
                return priceA - priceB
            })
        } else if (selectedSort === 'Price: High to Low') {
            return [...productsToSort].sort((a, b) => {
                const priceA = parseFloat(a.price?.toString().replace(/[^0-9.]/g, '') || '0')
                const priceB = parseFloat(b.price?.toString().replace(/[^0-9.]/g, '') || '0')
                return priceB - priceA
            })
        }
        // Default: return as is (badges already sorted to top)
        return productsToSort
    }
    
    const sortedProducts = sortProductsByBadge(products)
    const filteredProducts = applySorting(
        sortedProducts.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
    const displayedProducts = currentProducts
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

    const handlePrevious = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }
    
    const handleAddToCart = (product: Product) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice || '',
            image: product.image || '/placeholder.png',
            badge: product.badge
        })
        
        // Show success feedback
        setAddedToCart(prev => new Set([...prev, product.id]))
        
        // Remove feedback after 1 second
        setTimeout(() => {
            setAddedToCart(prev => {
                const newSet = new Set(prev)
                newSet.delete(product.id)
                return newSet
            })
        }, 1000)
    }

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
    }

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: number[] = []
        const maxVisiblePages = 4
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 2) {
                for (let i = 1; i <= maxVisiblePages; i++) {
                    pages.push(i)
                }
            } else if (currentPage >= totalPages - 1) {
                for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
                    pages.push(i)
                }
            } else {
                for (let i = currentPage - 1; i <= currentPage + 2; i++) {
                    pages.push(i)
                }
            }
        }
        return pages
    }

    if (loading) {
        return (
            <>
                <HeroHeader />
                <main className="overflow-hidden">
                    <section className="py-8 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <AnimatedGroup variants={transitionVariants}>
                                <div className="text-left mb-8">
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 15M7 13l-2.292 2.292c-.63.63-.184 1.707.446 2.292L7 13z" />
                                                </svg>
                                        </div>
                                        Shop 
                                    </h2>
                                    <p className="text-gray-600 text-lg">Discover our premium collection</p>
                                </div>
                            </AnimatedGroup>

                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading products...</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </>
        )
    }

    if (error) {
        return (
            <>
                <HeroHeader />
                <main className="overflow-hidden">
                    <section className="py-8 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <AnimatedGroup variants={transitionVariants}>
                                <div className="text-left mb-8">
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 15M7 13l-2.292 2.292c-.63.63-.184 1.707.446 2.292L7 13z" />
                                                </svg>
                                        </div>
                                        Shop 
                                    </h2>
                                    <p className="text-gray-600 text-lg">Discover our premium collection</p>
                                </div>
                            </AnimatedGroup>

                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Error loading products</h3>
                                    <p className="text-gray-600 mb-6">{error}</p>
                                    <Button 
                                        onClick={() => window.location.reload()}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </>
        )
    }
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section className="py-8 mt-16 px-4 sm:px-6 lg:px-8 bg-white">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <AnimatedGroup variants={transitionVariants}>
                            <div className="text-left mb-8">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-700 mb-2">
                                    Shop 
                                </h2>
                            </div>
                        </AnimatedGroup>

                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading products...</p>
                            </div>
                        </div>
                    </div>
                    </section>
                </main>
    </>
)

if (error) {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section className="py-8 mt-16 px-4 sm:px-6 lg:px-8 bg-white">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <AnimatedGroup variants={transitionVariants}>
                            <div className="text-left mb-8">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 15M7 13l-2.292 2.292c-.63.63-.184 1.707.446 2.292L7 13z" />
                                            </svg>
                                    </div>
                                    Shop 
                                </h2>
                                <p className="text-gray-600 text-lg">Discover our premium collection</p>
                            </div>
                        </AnimatedGroup>

                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="text-red-500 mb-4">Error loading products</div>
                                <p className="text-gray-600 mb-4">{error}</p>
                                <Button 
                                    onClick={() => window.location.reload()}
                                    className="bg-amber-900 text-white hover:bg-amber-800"
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}

return (
    <>
        <HeroHeader />
        <main className="overflow-hidden">
            <section className="py-8 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <AnimatedGroup variants={transitionVariants}>
                        <div className="text-left mb-8">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 15M7 13l-2.292 2.292c-.63.63-.184 1.707.446 2.292L7 13z" />
                                            </svg>
                                </div>
                                Shop 
                            </h2>
                            <p className="text-gray-600 text-lg">Discover our premium collection</p>
                        </div>
                    </AnimatedGroup>

                    {/* Search Bar */}
                    <AnimatedGroup variants={transitionVariants} className="relative z-1">
                        <div ref={searchWrapperRef} className="relative text-center mb-8">
                            {!profileDropdownOpen && !mobileMenuOpen && (
                                <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-2 mx-auto max-w-md">
                                    <div className="flex items-center gap-3">
                                        <Search className="w-5 h-5 text-green-600 ml-2" />
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            className="flex-1 py-3 px-2 text-gray-900 placeholder-gray-500 bg-transparent outline-none text-sm"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </AnimatedGroup>
                    
                    {/* Filters */}
                    <AnimatedGroup variants={transitionVariants}>
                        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                {/* Sort Options */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Sort by:</span>
                                    <select
                                        value={selectedSort}
                                        onChange={(e) => setSelectedSort(e.target.value)}
                                        className="px-4 py-3 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 cursor-pointer font-medium"
                                    >
                                        {sortOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </AnimatedGroup>
                    
                    {/* Products Grid */}
                    {displayedProducts.length === 0 ? (
                        <AnimatedGroup variants={transitionVariants}>
                            <div className="flex flex-col items-center justify-center min-h-[400px] py-16 px-4">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">No Products Available</h3>
                                    <p className="text-gray-600 text-sm sm:text-base mb-6 max-w-sm mx-auto">
                                        We're currently updating our collection. Check back soon for amazing new products!
                                    </p>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                            </div>
                        </AnimatedGroup>
                    ) : (
                    <AnimatedGroup variants={transitionVariants}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayedProducts.map((product) => (
                                <Link 
                                    key={product.id} 
                                    href={`/shop/${product.id}`}
                                    className="group block"
                                >
                                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300">
                                        {/* Product Image */}
                                        <div className="relative aspect-square bg-gray-50 overflow-hidden">
                                            <Image
                                                src={product.image || '/placeholder.png'}
                                                alt={product.name}
                                                width={300}
                                                height={300}
                                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                                    !product.inStock ? 'brightness-50' : ''
                                                }`}
                                                priority
                                            />
                                            
                                            {/* Badge */}
                                            {product.badge && (
                                                <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                                                    {product.badge}
                                                </span>
                                            )}
                                            
                                            {/* Sold Out Badge */}
                                            {!product.inStock && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                                    <div className="bg-white px-4 py-2 rounded-xl shadow-lg">
                                                        <span className="text-red-600 font-bold text-sm">SOLD OUT</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Quick Add Button */}
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    handleAddToCart(product)
                                                }}
                                                className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 z-20"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
                                        
                                        {/* Product Info */}
                                        <div className="p-4">
                                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-green-600 transition-colors">
                                                {product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <p className="text-lg font-bold text-green-600">
                                                    {product.price}
                                                </p>
                                                {addedToCart.has(product.id) && (
                                                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg">
                                                        ✓ Added
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </AnimatedGroup>
                    )}

                    {/* Pagination */}
                    <AnimatedGroup variants={transitionVariants}>
                        <div className="flex items-center justify-center space-x-2 mt-12 mb-10">
                            <button
                                onClick={() => {
                                    setCurrentPage(prev => Math.max(prev - 1, 1))
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={currentPage === 1}
                                className="px-5 py-3 text-sm bg-white border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-medium shadow-sm"
                            >
                                Previous
                            </button>

                            {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => {
                                const pageNumber = i + 1;
                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => {
                                            setCurrentPage(pageNumber)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                        className={`px-4 py-3 text-sm rounded-xl transition-colors font-medium shadow-sm ${
                                            currentPage === pageNumber
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border border-green-500'
                                                : 'bg-white border border-green-200 text-green-700 hover:bg-green-50'
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => {
                                    setCurrentPage(prev => Math.min(prev + 1, totalPages))
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={currentPage === totalPages}
                                className="px-5 py-3 text-sm bg-white border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-medium shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </AnimatedGroup>
                </div>
            </section>
                </section>

            </main>
        </>
    )
}

export default Shop
