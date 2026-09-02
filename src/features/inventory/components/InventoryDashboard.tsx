'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  RefreshCw,
  Package,
  Layers,
  Building2,
  TrendingDown,
  Clock,
  IndianRupee,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import ProductList from './ProductList'
import StockLedgerTable from './StockLedgerTable'
import WarehouseManagement from './WarehouseManagement'
import LowStockAlertCard from './LowStockAlertCard'
import ProductFormModal, { type MasterItemOption, type MasterSubItemOption } from './ProductFormModal'
import StockInwardModal from './StockInwardModal'
import StockOutwardModal from './StockOutwardModal'
import StockTransferModal from './StockTransferModal'
import StockAdjustmentModal from './StockAdjustmentModal'

import {
  getInventoryStatsAction,
  getLowStockAlertsAction,
  getExpiringBatchesAction,
  type InventoryStats,
  type LowStockAlertItem,
  type ExpiringBatchItem,
} from '../actions/inventory-report.actions'
import {
  getProductsAction,
  getProductCategoriesAction,
  type ProductRow,
} from '../actions/product.actions'
import {
  getWarehousesAction,
  type WarehouseRow,
} from '../actions/warehouse.actions'
import {
  getStockLedgerAction,
  type StockTransactionRow,
} from '../actions/stock.actions'
import { getInventoryMasterOptionsAction } from '@/features/settings/actions/masterData.actions'
import { canPerform } from '@/lib/permissions'
import type { UserRole } from '@/types/enums'

type ActiveTab = 'products' | 'movements' | 'warehouses' | 'alerts'

const VALID_TABS: ActiveTab[] = ['products', 'movements', 'warehouses', 'alerts']

interface InventoryDashboardProps {
  currentUser: { role: UserRole; name: string }
}

export default function InventoryDashboard({ currentUser }: InventoryDashboardProps) {
  const searchParams = useSearchParams()
  const initialTab = VALID_TABS.find((t) => t === searchParams.get('tab')) ?? 'products'
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)

  // Overview Data
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([])
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatchItem[]>([])

  // Master Data Options from Settings
  const [masterCategories, setMasterCategories] = useState<MasterItemOption[]>([])
  const [masterSubCategories, setMasterSubCategories] = useState<MasterSubItemOption[]>([])
  const [masterUoms, setMasterUoms] = useState<MasterItemOption[]>([])
  const [masterWarehouseTypes, setMasterWarehouseTypes] = useState<MasterItemOption[]>([])
  const [masterAdjustmentReasons, setMasterAdjustmentReasons] = useState<MasterItemOption[]>([])
  const [masterTaxRates, setMasterTaxRates] = useState<MasterItemOption[]>([])

  // Products Tab State
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productWarehouseId, setProductWarehouseId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [productPage, setProductPage] = useState(1)
  const [productTotalPages, setProductTotalPages] = useState(1)
  const [productTotal, setProductTotal] = useState(0)
  const [isProductsLoading, setIsProductsLoading] = useState(true)

  // Movements Tab State
  const [movements, setMovements] = useState<StockTransactionRow[]>([])
  const [movementType, setMovementType] = useState('')
  const [movementWarehouseId, setMovementWarehouseId] = useState('')
  const [movementStartDate, setMovementStartDate] = useState('')
  const [movementEndDate, setMovementEndDate] = useState('')
  const [movementPage, setMovementPage] = useState(1)
  const [movementTotalPages, setMovementTotalPages] = useState(1)
  const [movementTotal, setMovementTotal] = useState(0)
  const [isMovementsLoading, setIsMovementsLoading] = useState(false)

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false)
  const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)

  // ─── Fetch Stats, Warehouses & Master Data ─────────────────────────────────
  const fetchOverviewData = useCallback(async () => {
    const [statsRes, whRes, catRes, lowRes, expRes, masterRes] = await Promise.all([
      getInventoryStatsAction(),
      getWarehousesAction(),
      getProductCategoriesAction(),
      getLowStockAlertsAction(),
      getExpiringBatchesAction(),
      getInventoryMasterOptionsAction(),
    ])

    if (statsRes.ok) setStats(statsRes.data)
    if (whRes.ok) setWarehouses(whRes.data)
    if (catRes.ok) setCategories(catRes.data)
    if (lowRes.ok) setLowStockAlerts(lowRes.data)
    if (expRes.ok) setExpiringBatches(expRes.data)

    if (masterRes.ok && masterRes.data) {
      setMasterCategories(masterRes.data.categories)
      setMasterSubCategories(masterRes.data.subCategories)
      setMasterUoms(masterRes.data.uoms)
      setMasterWarehouseTypes(masterRes.data.warehouseTypes)
      setMasterAdjustmentReasons(masterRes.data.adjustmentReasons)
      setMasterTaxRates(masterRes.data.taxRates)
    }
  }, [])

  // ─── Fetch Products ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setIsProductsLoading(true)
    const res = await getProductsAction({
      search:       productSearch || undefined,
      category:     productCategory || undefined,
      warehouseId:  productWarehouseId || undefined,
      lowStockOnly: lowStockOnly || undefined,
      page:         productPage,
      limit:        20,
    })

    if (res.ok) {
      setProducts(res.data.data)
      setProductTotalPages(res.data.totalPages)
      setProductTotal(res.data.total)
    }
    setIsProductsLoading(false)
  }, [productSearch, productCategory, productWarehouseId, lowStockOnly, productPage])

  // ─── Fetch Movements ────────────────────────────────────────────────────────
  const fetchMovements = useCallback(async () => {
    setIsMovementsLoading(true)
    const res = await getStockLedgerAction({
      type:        movementType || undefined,
      warehouseId: movementWarehouseId || undefined,
      startDate:   movementStartDate || undefined,
      endDate:     movementEndDate || undefined,
      page:        movementPage,
      limit:       20,
    })

    if (res.ok) {
      setMovements(res.data.data)
      setMovementTotalPages(res.data.totalPages)
      setMovementTotal(res.data.total)
    }
    setIsMovementsLoading(false)
  }, [movementType, movementWarehouseId, movementStartDate, movementEndDate, movementPage])

  useEffect(() => {
    fetchOverviewData()
  }, [fetchOverviewData])

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts()
    } else if (activeTab === 'movements') {
      fetchMovements()
    }
  }, [activeTab, fetchProducts, fetchMovements])

  function handleRefreshAll() {
    fetchOverviewData()
    if (activeTab === 'products') fetchProducts()
    if (activeTab === 'movements') fetchMovements()
  }

  const canCreateProduct = canPerform(currentUser.role, 'inventory:create')
  const canInward         = canPerform(currentUser.role, 'stock:inward')
  const canTransfer       = canPerform(currentUser.role, 'stock:transfer')
  const canAdjust         = canPerform(currentUser.role, 'stock:adjust')

  function handleOpenCreateProduct() {
    setEditingProduct(null)
    setIsProductModalOpen(true)
  }

  function handleOpenEditProduct(p: ProductRow) {
    setEditingProduct(p)
    setIsProductModalOpen(true)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        icon={Boxes}
        title="Inventory & Stock Management"
        subtitle="Manage product catalog, multi-warehouse stock levels, batch tracking, and movement ledgers"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="p-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {canInward && (
              <button
                onClick={() => setIsInwardModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 shadow-sm transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Inward Stock
              </button>
            )}

            <button
              onClick={() => setIsOutwardModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-950 bg-blue-200 hover:bg-blue-100 shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              Dispatch / Sample
            </button>

            {canTransfer && (
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-purple-950 bg-purple-200 hover:bg-purple-100 shadow-sm transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Transfer
              </button>
            )}

            {canAdjust && (
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-950 bg-amber-200 hover:bg-amber-100 shadow-sm transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Adjust / Audit
              </button>
            )}

            {canCreateProduct && (
              <button
                onClick={handleOpenCreateProduct}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-900 bg-white hover:bg-slate-100 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Product
              </button>
            )}
          </div>
        }
      />

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total SKUs */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active SKUs</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalSkus ?? '—'}
          </div>
          <span className="text-[11px] text-slate-400">across {categories.length} categories</span>
        </div>

        {/* Total Stock Units */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Quantity</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalStockQuantity ? stats.totalStockQuantity.toLocaleString() : '0'}
          </div>
          <span className="text-[11px] text-slate-400">units in inventory</span>
        </div>

        {/* Stock Valuation */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Stock Valuation</span>
            <IndianRupee className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            ₹{stats?.totalStockSalesValue ? (stats.totalStockSalesValue / 100000).toFixed(1) + ' L' : '0'}
          </div>
          <span className="text-[11px] text-slate-400">
            Cost: ₹{stats?.totalStockCostValue ? (stats.totalStockCostValue / 100000).toFixed(1) + ' L' : '0'}
          </span>
        </div>

        {/* Warehouses */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Storage Points</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalWarehouses ?? '0'}
          </div>
          <span className="text-[11px] text-slate-400">depots & regional hubs</span>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => setActiveTab('alerts')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
            (stats?.lowStockCount ?? 0) > 0
              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/30 hover:border-rose-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Low Stock
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats?.lowStockCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">below min threshold</span>
        </div>

        {/* Expiring Batches */}
        <div
          onClick={() => setActiveTab('alerts')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
            (stats?.nearExpiryBatchCount ?? 0) > 0 || (stats?.expiredBatchCount ?? 0) > 0
              ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 hover:border-amber-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Near Expiry
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats?.nearExpiryBatchCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats?.expiredBatchCount ?? 0} expired lots
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Product Catalog & Stock ({productTotal || products.length})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stock Ledger & Movements
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'warehouses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Warehouses & Depots ({warehouses.length})
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Alerts & Expiry
            {(lowStockAlerts.length > 0 || expiringBatches.length > 0) && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                {lowStockAlerts.length + expiringBatches.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'products' && (
        <ProductList
          products={products}
          categories={masterCategories.length > 0 ? masterCategories : categories}
          warehouses={warehouses}
          onAddProduct={handleOpenCreateProduct}
          onEditProduct={handleOpenEditProduct}
          onRefresh={handleRefreshAll}
          search={productSearch}
          setSearch={setProductSearch}
          category={productCategory}
          setCategory={setProductCategory}
          warehouseId={productWarehouseId}
          setWarehouseId={setProductWarehouseId}
          lowStockOnly={lowStockOnly}
          setLowStockOnly={setLowStockOnly}
          page={productPage}
          setPage={setProductPage}
          totalPages={productTotalPages}
          total={productTotal}
          isLoading={isProductsLoading}
        />
      )}

      {activeTab === 'movements' && (
        <StockLedgerTable
          movements={movements}
          warehouses={warehouses}
          typeFilter={movementType}
          setTypeFilter={setMovementType}
          warehouseId={movementWarehouseId}
          setWarehouseId={setMovementWarehouseId}
          startDate={movementStartDate}
          setStartDate={setMovementStartDate}
          endDate={movementEndDate}
          setEndDate={setMovementEndDate}
          page={movementPage}
          setPage={setMovementPage}
          totalPages={movementTotalPages}
          total={movementTotal}
          isLoading={isMovementsLoading}
        />
      )}

      {activeTab === 'warehouses' && (
        <WarehouseManagement
          warehouses={warehouses}
          warehouseTypes={masterWarehouseTypes}
          onRefresh={handleRefreshAll}
        />
      )}

      {activeTab === 'alerts' && (
        <LowStockAlertCard
          lowStockItems={lowStockAlerts}
          expiringBatches={expiringBatches}
          onRestock={() => canInward && setIsInwardModalOpen(true)}
        />
      )}

      {/* Modals */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={handleRefreshAll}
          product={editingProduct}
          categories={masterCategories}
          subCategories={masterSubCategories}
          uoms={masterUoms}
          taxRates={masterTaxRates}
        />
      )}

      {isInwardModalOpen && (
        <StockInwardModal
          isOpen={isInwardModalOpen}
          onClose={() => setIsInwardModalOpen(false)}
          onSuccess={handleRefreshAll}
          products={products}
          warehouses={warehouses}
        />
      )}

      {isOutwardModalOpen && (
        <StockOutwardModal
          isOpen={isOutwardModalOpen}
          onClose={() => setIsOutwardModalOpen(false)}
          onSuccess={handleRefreshAll}
          products={products}
          warehouses={warehouses}
          currentUser={currentUser}
        />
      )}

      {isTransferModalOpen && (
        <StockTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={handleRefreshAll}
          products={products}
          warehouses={warehouses}
        />
      )}

      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccess={handleRefreshAll}
          products={products}
          warehouses={warehouses}
          adjustmentReasons={masterAdjustmentReasons}
        />
      )}
    </div>
  )
}
