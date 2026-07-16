import React, { useState } from 'react';
import { Truck, Calendar, Edit2, Trash2, XCircle, AlertCircle, ShoppingBag, Plus, Minus } from 'lucide-react';
import { Order, OrderItem, getPriceRange } from '../../lib/db';
import Button from '../atoms/Button';
import ConfirmModal from '../ui/ConfirmModal';

interface ClientOrdersListProps {
  orders: Order[];
  onCancelOrder: (orderId: string) => void;
  onUpdateOrder: (orderId: string, items: OrderItem[]) => void;
  priceRangePct?: number;
}

export default function ClientOrdersList({
  orders,
  onCancelOrder,
  onUpdateOrder,
  priceRangePct = 5
}: ClientOrdersListProps) {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [isCancelFromEmpty, setIsCancelFromEmpty] = useState(false);

  const handleStartEdit = (order: Order) => {
    setEditingOrder(order);
    setEditItems(JSON.parse(JSON.stringify(order.items))); // deep clone
  };

  const handleQtyChange = (productId: string, variantName: string | undefined, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId && item.selectedVariant === variantName) {
        const nextQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string, variantName: string | undefined) => {
    setEditItems(prev => prev.filter(item => !(item.productId === productId && item.selectedVariant === variantName)));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editingOrder.id) return;

    if (editItems.length === 0) {
      setCancellingOrderId(editingOrder.id);
      setIsCancelFromEmpty(true);
      setEditingOrder(null);
      return;
    }

    onUpdateOrder(editingOrder.id, editItems);
    setEditingOrder(null);
  };

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200/50 dark:border-emerald-900/30';
      case 'processing':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-955/20 border border-blue-200/50 dark:border-blue-900/30';
      case 'cancelled':
        return 'text-rose-500 bg-rose-50 dark:bg-rose-955/20 border border-rose-200/50 dark:border-rose-900/30';
      default: // pending
        return 'text-amber-500 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-[#5d51e8]/10 text-[#5d51e8] p-2.5 rounded-2xl">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
            My Order Requests
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-zinc-500 pt-1">
            Track, edit, or cancel your submitted product orders.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm">
            You haven't placed any order requests yet.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            return (
              <div 
                key={order.id} 
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] sm:text-xs font-black uppercase px-3 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {order.assignedSalesmanName && (
                      <span className="text-[9px] bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg font-black border border-purple-100/50 dark:border-purple-900/40 uppercase tracking-wider">
                        Prep: {order.assignedSalesmanName}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Total Value Range: </span>
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {(() => {
                        let minTotal = 0;
                        let maxTotal = 0;
                        order.items.forEach(item => {
                          const qty = item.quantity || 1;
                          if (item.minPrice !== undefined && item.maxPrice !== undefined && item.minPrice !== null && item.maxPrice !== null && item.minPrice > 0 && item.maxPrice > 0) {
                            minTotal += item.minPrice * qty;
                            maxTotal += item.maxPrice * qty;
                          } else {
                            const itemPct = item.priceRangePct !== undefined ? item.priceRangePct : priceRangePct;
                            const factor = itemPct / 100;
                            minTotal += item.price * (1 - factor) * qty;
                            maxTotal += item.price * (1 + factor) * qty;
                          }
                        });
                        return `₹${Math.floor(minTotal).toLocaleString('en-IN')} - ₹${Math.ceil(maxTotal).toLocaleString('en-IN')}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {order.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-50/50 dark:bg-zinc-950 border border-slate-150/50 dark:border-zinc-850 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="bg-[#5d51e8]/10 text-[#5d51e8] p-1.5 rounded-lg flex-shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {item.nameEn}
                            {item.selectedVariant && (
                              <span className="text-[10px] text-[#5d51e8] dark:text-indigo-400 font-extrabold ml-1.5 uppercase">({item.selectedVariant})</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Qty: {item.quantity}
                            {(item.code || item.design) && ` | Code: ${item.code || 'N/A'} | Design: ${item.design || 'N/A'}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap ml-2">
                        {getPriceRange(item.price * item.quantity, item.priceRangePct !== undefined ? item.priceRangePct : priceRangePct, item.minPrice ? item.minPrice * item.quantity : undefined, item.maxPrice ? item.maxPrice * item.quantity : undefined)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action buttons (only show if pending) */}
                {order.status === 'pending' && (
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(order)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-255 font-extrabold text-xs rounded-full transition-all cursor-pointer border border-slate-200 dark:border-zinc-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancellingOrderId(order.id || '');
                        setIsCancelFromEmpty(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-450 font-extrabold text-xs rounded-full transition-all cursor-pointer border border-rose-200/50 dark:border-rose-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Order</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-md w-full rounded-[2.2rem] p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-250 max-h-[85vh] overflow-y-auto">
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                Modify Order Items
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Adjust quantities or remove items from your order request
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {editItems.map((item) => (
                  <div key={item.productId + '_' + (item.selectedVariant || '')} className="flex items-center justify-between bg-slate-50 dark:bg-zinc-955 border border-slate-150/50 dark:border-zinc-850 p-3 rounded-2xl">
                    <div className="space-y-0.5 text-left max-w-[55%]">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        {item.nameEn}
                        {item.selectedVariant && (
                          <span className="text-[10px] text-[#5d51e8] dark:text-indigo-400 font-extrabold ml-1.5 uppercase">({item.selectedVariant})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {getPriceRange(item.price, item.priceRangePct !== undefined ? item.priceRangePct : priceRangePct, item.minPrice, item.maxPrice)} / {item.unit}
                        {(item.code || item.design) && ` | Code: ${item.code || 'N/A'} | Design: ${item.design || 'N/A'}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, item.selectedVariant, -1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 px-1">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, item.selectedVariant, 1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId, item.selectedVariant)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs py-3 px-4 rounded-full border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="w-full py-3 text-xs"
                >
                  Save Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Confirm Modal */}
      <ConfirmModal
        isOpen={cancellingOrderId !== null}
        onClose={() => {
          setCancellingOrderId(null);
          setIsCancelFromEmpty(false);
        }}
        onConfirm={() => {
          if (cancellingOrderId) {
            onCancelOrder(cancellingOrderId);
            setCancellingOrderId(null);
            setIsCancelFromEmpty(false);
          }
        }}
        title="Cancel Order Request"
        message={isCancelFromEmpty 
          ? "Removing all items will cancel this order request. Do you want to cancel this order?"
          : "Are you sure you want to delete/cancel this order request? This action cannot be undone."
        }
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
      />
    </div>
  );
}
