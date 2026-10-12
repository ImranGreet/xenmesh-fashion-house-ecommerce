import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { http } from '../api/http'

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type AdminOrder = {
  id: number
  number: string
  customerName: string
  phone: string
  email: string | null
  address: string
  city: string | null
  notes: string | null
  paymentMethod: 'CASH_ON_DELIVERY'
  status: OrderStatus
  total: number
  createdAt: string
  items: { id: number; name: string; sku: string; unitPrice: number; quantity: number; lineTotal: number }[]
}

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function OrdersTable() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    http.get<AdminOrder[]>('/admin/orders', { signal: controller.signal })
      .then(({ data }) => setOrders(data))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        const message = axios.isAxiosError<{ message?: string | string[] }>(requestError)
          ? requestError.response?.data.message
          : undefined
        setError(Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : requestError instanceof Error
              ? requestError.message
              : 'Unable to load orders.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  async function updateStatus(order: AdminOrder, status: OrderStatus) {
    setError('')
    setUpdatingOrderId(order.id)
    try {
      await http.patch(`/admin/orders/${order.id}`, { status })
      setRefreshKey((key) => key + 1)
    } catch (requestError: unknown) {
      const message = axios.isAxiosError<{ message?: string | string[] }>(requestError)
        ? requestError.response?.data.message
        : undefined
      setError(Array.isArray(message)
        ? message.join(', ')
        : typeof message === 'string'
          ? message
          : requestError instanceof Error
            ? requestError.message
            : 'Unable to update order.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (loading) return <div className="orders-loading" role="status">Loading the latest orders…</div>

  return (
    <div>
      <div className="orders-toolbar">
        {error && <p className="orders-error" role="alert">{error}</p>}
        <button className="orders-refresh" type="button" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1) }}>Refresh orders</button>
      </div>
      {orders.length === 0 && !error
        ? <p className="orders-empty">No orders have been placed yet.</p>
        : <div className="orders-table-scroll">
      <table className="orders-table">
        <thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL · COD</th><th>PLACED</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <Fragment key={order.id}>
              <tr>
                <td><strong>{order.number}</strong></td>
                <td><strong>{order.customerName}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></td>
                <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</td>
                <td><strong>{formatPrice(order.total)}</strong><small>Pay on delivery</small></td>
                <td>{formatDate(order.createdAt)}</td>
                <td><span className={`order-status-badge status-${order.status.toLowerCase()}`}>{order.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="order-row-actions">
                    <button type="button" onClick={() => setExpandedOrder((current) => current === order.id ? null : order.id)}>{expandedOrder === order.id ? 'Hide' : 'Details'}</button>
                    {nextStatuses[order.status].length > 0 && (
                      <select aria-label={`Change status for ${order.number}`} value="" disabled={updatingOrderId === order.id} onChange={(event) => updateStatus(order, event.target.value as OrderStatus)}>
                        <option value="" disabled>Update</option>
                        {nextStatuses[order.status].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
              {expandedOrder === order.id && (
                <tr className="order-details-row">
                  <td colSpan={7}>
                    <div className="order-details-grid">
                      <section><strong>Delivery details</strong><span>{order.address}{order.city ? `, ${order.city}` : ''}</span>{order.email && <a href={`mailto:${order.email}`}>{order.email}</a>}{order.notes && <small>Note: {order.notes}</small>}</section>
                      <section><strong>Ordered products</strong>{order.items.map((item) => <span key={item.id}>{item.quantity} × {item.name} · {formatPrice(item.lineTotal)}</span>)}</section>
                      <a className="order-call-action" href={`tel:${order.phone}`}>Call customer</a>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>}
    </div>
  )
}
