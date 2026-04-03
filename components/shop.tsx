'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSort, setSelectedSort] = useState('Default')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [currentPage, setCurrentPage] = useState(1)
    const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // reference and positioning for dropdown so we can render it
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
    
    // Sort products to keep badged items at top
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
                    <section className="py-12 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-gray-100">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <AnimatedGroup variants={transitionVariants}>
                                <div className="text-left mb-10">
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-3 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                        </div>
                                        Shop
                                    </h2>
                                    <p className="text-gray-600 text-lg font-light">Shop</p>
                                </div>
                            </AnimatedGroup>

                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-14 w-14 border-2 border-slate-700 border-t-transparent mx-auto mb-6"></div>
                                    <p className="text-gray-600 text-lg">Loading collection...</p>
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
                    <section className="py-12 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-gray-100">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <AnimatedGroup variants={transitionVariants}>
                                <div className="text-left mb-10">
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-3 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        Shop
                                    </h2>
                                    <p className="text-gray-600 text-lg font-light">Shop</p>
                                </div>
                            </AnimatedGroup>

                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-light text-gray-900 mb-4">Unable to load collection</h3>
                                    <p className="text-gray-600 mb-8 text-lg">{error}</p>
                                    <Button 
                                        onClick={() => window.location.reload()}
                                        className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-8 py-4 rounded-lg font-light transition-all duration-300 shadow-lg hover:shadow-xl"
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
                <section className="py-12 mt-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-gray-100">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                    
                        {/* Search Bar */}
                        <AnimatedGroup variants={transitionVariants} className="relative z-1">
                            <div ref={searchWrapperRef} className="relative text-center mb-5">
                                {!profileDropdownOpen && !mobileMenuOpen && (
                                    <div className="bg-white rounded-lg shadow-md border border-slate-200 p-2 mx-auto max-w-lg">
                                        <div className="flex items-center gap-3">
                                            <Search className="w-4 h-4 text-slate-500 ml-2" />
                                            <input
                                                type="text"
                                                placeholder="Search collection..."
                                                className="flex-1 py-2 px-3 text-gray-900 placeholder-slate-400 bg-transparent outline-none text-sm font-light"
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
                            <div className="bg-white/1 rounded-lg  border border-slate-100 p-4 mb-10">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* Sort Options */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
                                        <select
                                            value={selectedSort}
                                            onChange={(e) => setSelectedSort(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-gray-50 cursor-pointer font-light"
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
                                <div className="flex flex-col items-center justify-center min-h-[400px] py-20 px-4">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
                                            <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-light text-gray-900 mb-4">No products available</h3>
                                        <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto font-light">
                                            We're currently updating our collection. Please check back soon.
                                        </p>
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-8 py-4 rounded-lg font-light transition-all duration-300 shadow-lg hover:shadow-xl"
                                            >
                                                Clear Search
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </AnimatedGroup>
                        ) : (
                            <AnimatedGroup variants={transitionVariants}>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {displayedProducts.map((product) => (
                                        <Link 
                                            key={product.id} 
                                            href={`/shop/${product.id}`}
                                            className="group block"
                                        >
                                            <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-slate-300">
                                                {/* Product Image */}
                                                <div className="relative aspect-square bg-slate-50 overflow-hidden">
                                                    <Image
                                                        src={product.image || '/placeholder.png'}
                                                        alt={product.name}
                                                        width={300}
                                                        height={300}
                                                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                                            !product.inStock ? 'brightness-75' : ''
                                                        }`}
                                                        priority
                                                    />
                                                    
                                                    {/* Badge */}
                                                    {product.badge && (
                                                        <span className="absolute top-2 left-2 bg-gradient-to-r from-slate-700 to-slate-900 text-white text-xs px-3 py-2 rounded-md font-medium shadow-lg">
                                                            {product.badge}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Sold Out Badge */}
                                                    {!product.inStock && (
                                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                                            <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                                                                <span className="text-slate-700 font-medium text-sm">Out of Stock</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Quick Add Button */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            router.push(`/shop/${product.id}`)
                                                        }}
                                                        className="absolute bottom-2 right-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 z-20"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                
                                                {/* Product Info */}
                                                <div className="p-5">
                                                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-3 group-hover:text-slate-700 transition-colors">
                                                        {product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}
                                                    </h3>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-lg font-semibold text-slate-700">
                                                            {product.price}
                                                        </p>
                                                        {addedToCart.has(product.id) && (
                                                            <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md">
                                                                Added
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
                            <div className="flex items-center justify-center space-x-2 mt-16 mb-12">
                                <button
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(prev - 1, 1))
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }}
                                    disabled={currentPage === 1}
                                    className="px-6 py-3 text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
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
                                            className={`px-4 py-3 text-sm rounded-lg transition-colors font-medium ${
                                                currentPage === pageNumber
                                                    ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white border border-slate-700'
                                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
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
                                    className="px-6 py-3 text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>
            </main>
        </>
    )
}

export default Shop
