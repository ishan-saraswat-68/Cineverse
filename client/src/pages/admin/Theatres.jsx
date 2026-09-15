import React, { useEffect, useState } from 'react'
import { PlusIcon, Building2, MapPin, Phone, Trash2, Edit3, X, Check, Armchair } from 'lucide-react'
import Title from '../../components/admin/Title'
import Loading from '../../components/Loading'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const DEFAULT_SECTIONS = [
  { name: 'Recliner', enabled: true, rows: 2, seatsPerRow: 8 },
  { name: 'Executive', enabled: true, rows: 4, seatsPerRow: 10 },
  { name: 'Classic', enabled: true, rows: 6, seatsPerRow: 12 }
]

const Theatres = () => {
  const { axios, getToken, user } = useAppContext()
  const [theatres, setTheatres] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTheatreId, setEditingTheatreId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    totalHalls: 1,
    sections: DEFAULT_SECTIONS
  })

  const fetchTheatres = async () => {
    try {
      const { data } = await axios.get('/api/theatre/all')
      if (data.success) {
        setTheatres(data.theatres)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load theatres')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchTheatres()
  }, [user])

  const openAddModal = () => {
    setEditingTheatreId(null)
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      totalHalls: 1,
      sections: DEFAULT_SECTIONS
    })
    setModalOpen(true)
  }

  const openEditModal = (th) => {
    setEditingTheatreId(th._id)
    const sections = DEFAULT_SECTIONS.map(def => {
      const existing = th.seatingSections?.find(s => s.name === def.name)
      return existing
        ? { name: def.name, enabled: true, rows: existing.rows, seatsPerRow: existing.seatsPerRow }
        : { ...def, enabled: false }
    })

    setFormData({
      name: th.name,
      address: th.address,
      city: th.city,
      state: th.state,
      pincode: th.pincode,
      phone: th.phone || '',
      totalHalls: th.totalHalls || 1,
      sections
    })
    setModalOpen(true)
  }

  const handleSectionToggle = (index) => {
    setFormData(prev => {
      const newSections = [...prev.sections]
      newSections[index].enabled = !newSections[index].enabled
      return { ...prev, sections: newSections }
    })
  }

  const handleSectionChange = (index, field, value) => {
    const val = Math.max(1, parseInt(value) || 1)
    setFormData(prev => {
      const newSections = [...prev.sections]
      newSections[index][field] = val
      return { ...prev, sections: newSections }
    })
  }

  // Calculate live total seats
  const calculatedTotalSeats = formData.sections
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + (s.rows * s.seatsPerRow), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      return toast.error('Please fill in all required fields')
    }
    const enabledSections = formData.sections.filter(s => s.enabled)
    if (enabledSections.length === 0) {
      return toast.error('Please enable at least one seating section')
    }

    try {
      setSubmitting(true)
      const token = await getToken()
      const payload = { ...formData, sections: enabledSections }

      if (editingTheatreId) {
        const { data } = await axios.put(`/api/theatre/${editingTheatreId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
          toast.success('Theatre updated successfully')
          setModalOpen(false)
          fetchTheatres()
        }
      } else {
        const { data } = await axios.post('/api/theatre/add', payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
          toast.success('Theatre registered successfully')
          setModalOpen(false)
          fetchTheatres()
        }
      }
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this theatre?')) return
    try {
      const token = await getToken()
      const { data } = await axios.delete(`/api/theatre/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        fetchTheatres()
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete theatre')
    }
  }

  return !loading ? (
    <div>
      <div className='flex items-center justify-between'>
        <Title text1="Manage" text2="Theatres" />
        <button
          onClick={openAddModal}
          className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dull transition font-medium cursor-pointer text-sm active:scale-95'
        >
          <PlusIcon className='w-4 h-4' />
          Add Theatre
        </button>
      </div>

      {/* Theatres Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8'>
        {theatres.map((th) => (
          <div
            key={th._id}
            className='bg-[#111827] border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition duration-300 flex flex-col justify-between'
          >
            <div>
              <div className='flex items-start justify-between gap-2'>
                <h3 className='text-lg font-bold text-white'>{th.name}</h3>
                <div className='flex items-center gap-1.5'>
                  <button
                    onClick={() => openEditModal(th)}
                    className='p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition'
                    title="Edit"
                  >
                    <Edit3 className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(th._id)}
                    className='p-1.5 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition'
                    title="Delete"
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <p className='text-xs text-gray-400 flex items-center gap-1.5 mt-2'>
                <MapPin className='w-3.5 h-3.5 text-primary' />
                {th.address}, {th.city}, {th.state} - {th.pincode}
              </p>
              {th.phone && (
                <p className='text-xs text-gray-400 flex items-center gap-1.5 mt-1'>
                  <Phone className='w-3.5 h-3.5 text-primary' />
                  {th.phone}
                </p>
              )}

              {/* Sections Matrix Badges */}
              <div className='mt-5 pt-4 border-t border-white/5'>
                <p className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2'>
                  Seat Matrix ({th.totalSeats} Total Seats)
                </p>
                <div className='flex flex-wrap gap-2'>
                  {th.seatingSections?.map((sec, idx) => (
                    <span
                      key={idx}
                      className='text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300'
                    >
                      <strong className='text-primary'>{sec.name}:</strong> {sec.rows}R × {sec.seatsPerRow}S ({sec.rows * sec.seatsPerRow})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-5 pt-3 flex items-center justify-between text-xs text-gray-400'>
              <span>Halls: {th.totalHalls}</span>
              <span className='text-emerald-400 font-medium'>Active</span>
            </div>
          </div>
        ))}
      </div>

      {theatres.length === 0 && (
        <div className='text-center py-20 text-gray-400'>
          <Building2 className='w-12 h-12 mx-auto text-gray-600 mb-3' />
          <p className='text-base font-medium text-white'>No theatres registered yet</p>
          <p className='text-sm mt-1'>Click "Add Theatre" to create your first cinema.</p>
        </div>
      )}

      {/* Modal for Add / Edit Theatre */}
      {modalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm'>
          <div className='bg-[#111827] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl'>
            <div className='flex items-center justify-between pb-4 border-b border-white/10'>
              <h2 className='text-xl font-bold text-white'>
                {editingTheatreId ? 'Edit Theatre' : 'Add New Theatre'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className='p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4 mt-6'>
              <div>
                <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                  Theatre Name *
                </label>
                <input
                  type='text'
                  required
                  placeholder='e.g. PVR Cinemas - Phoenix Mall'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                  Address *
                </label>
                <input
                  type='text'
                  required
                  placeholder='e.g. Level 4, Phoenix Marketcity'
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                    City *
                  </label>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Mumbai'
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                  />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                    State *
                  </label>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Maharashtra'
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                    Pincode *
                  </label>
                  <input
                    type='text'
                    required
                    placeholder='e.g. 400070'
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                  />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
                    Phone Number
                  </label>
                  <input
                    type='text'
                    placeholder='e.g. +91 9876543210'
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className='w-full px-4 py-2.5 bg-black/40 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-primary transition'
                  />
                </div>
              </div>

              {/* Dynamic Seat Matrix Section */}
              <div className='mt-6 pt-5 border-t border-white/10'>
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <h3 className='text-sm font-bold text-white uppercase tracking-wider'>
                      Seat Matrix Configuration
                    </h3>
                    <p className='text-xs text-gray-400'>
                      Toggle sections and configure rows & seats per row.
                    </p>
                  </div>
                  <div className='text-right'>
                    <span className='text-xs text-gray-400'>Total Capacity:</span>
                    <span className='ml-2 text-sm font-bold text-primary'>
                      {calculatedTotalSeats} Seats
                    </span>
                  </div>
                </div>

                <div className='space-y-3'>
                  {formData.sections.map((sec, idx) => (
                    <div
                      key={sec.name}
                      className={`p-4 rounded-xl border transition ${
                        sec.enabled
                          ? 'bg-white/5 border-primary/40'
                          : 'bg-black/20 border-white/5 opacity-60'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <label className='flex items-center gap-3 cursor-pointer'>
                          <input
                            type='checkbox'
                            checked={sec.enabled}
                            onChange={() => handleSectionToggle(idx)}
                            className='w-4 h-4 accent-cyan-500 rounded cursor-pointer'
                          />
                          <span className='font-semibold text-sm text-white flex items-center gap-1.5'>
                            <Armchair className='w-4 h-4 text-primary' />
                            {sec.name} Section
                          </span>
                        </label>
                        {sec.enabled && (
                          <span className='text-xs text-primary font-medium'>
                            {sec.rows * sec.seatsPerRow} seats
                          </span>
                        )}
                      </div>

                      {sec.enabled && (
                        <div className='grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5'>
                          <div>
                            <label className='block text-xs text-gray-400 mb-1'>Rows</label>
                            <input
                              type='number'
                              min='1'
                              max='26'
                              value={sec.rows}
                              onChange={(e) => handleSectionChange(idx, 'rows', e.target.value)}
                              className='w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-md text-white text-sm outline-none focus:border-primary'
                            />
                          </div>
                          <div>
                            <label className='block text-xs text-gray-400 mb-1'>Seats per Row</label>
                            <input
                              type='number'
                              min='1'
                              max='30'
                              value={sec.seatsPerRow}
                              onChange={(e) =>
                                handleSectionChange(idx, 'seatsPerRow', e.target.value)
                              }
                              className='w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-md text-white text-sm outline-none focus:border-primary'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className='pt-6 flex items-center justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setModalOpen(false)}
                  className='px-5 py-2.5 text-sm text-gray-300 hover:text-white transition cursor-pointer'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='px-6 py-2.5 bg-primary hover:bg-primary-dull text-white rounded-lg text-sm font-medium transition cursor-pointer active:scale-95 disabled:opacity-50'
                >
                  {submitting ? 'Saving...' : editingTheatreId ? 'Update Theatre' : 'Add Theatre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  )
}

export default Theatres
