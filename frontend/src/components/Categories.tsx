import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Icon } from './common/Icon';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const SELECTABLE_ICONS = [
  'Briefcase', 'Building', 'Laptop', 'TrendingUp', 'Percent', 'Gift', 
  'Heart', 'Plane', 'Car', 'Home', 'Utensils', 'ShoppingBag', 
  'ShoppingCart', 'Fuel', 'Receipt', 'HeartPulse', 'GraduationCap', 
  'Gamepad2', 'Youtube', 'ShieldCheck', 'Coffee', 'Phone', 'Globe', 'HelpCircle'
];

const PALETTE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0D9488', '#06B6D4', 
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B', '#1E3A8A'
];

export const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinance();

  // Modals state
  const [isOpen, setIsOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [selectedIcon, setSelectedIcon] = useState('HelpCircle');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Separate Income and Expense
  const incomeCats = categories.filter(c => c.type === 'INCOME');
  const expenseCats = categories.filter(c => c.type === 'EXPENSE');

  const handleOpenAdd = () => {
    setEditingCat(null);
    setName('');
    setType('EXPENSE');
    setSelectedIcon('HelpCircle');
    setSelectedColor('#10B981');
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCat(cat);
    setName(cat.name);
    setType(cat.type);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');

    setLoading(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor
        });
      } else {
        await addCategory(name.trim(), type, selectedIcon, selectedColor);
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"? Transactions assigned to this category will become Uncategorized.`)) return;
    try {
      await deleteCategory(cat.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Categories</h1>
          <p>Organize cash flows into clean categories with custom colors and shapes.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      <div className="content-grid">
        {/* Income Categories Column */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
            Income Categories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incomeCats.map(cat => {
              const isSystem = cat.userId === null;
              return (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${cat.color}15`, color: cat.color, display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                      <Icon name={cat.icon} size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{cat.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isSystem ? 'System Default' : 'Custom'}</div>
                    </div>
                  </div>
                  {!isSystem && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleOpenEdit(cat)}>
                        <Edit2 size={16} />
                      </button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleDelete(cat)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Categories Column */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span>
            Expense Categories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {expenseCats.map(cat => {
              const isSystem = cat.userId === null;
              return (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${cat.color}15`, color: cat.color, display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                      <Icon name={cat.icon} size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{cat.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isSystem ? 'System Default' : 'Custom'}</div>
                    </div>
                  </div>
                  {!isSystem && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleOpenEdit(cat)}>
                        <Edit2 size={16} />
                      </button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => handleDelete(cat)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal Dialog */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCat ? 'Edit Category' : 'Add Category'}</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Grocery, Freelance" 
                  className="input-premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Flow Type</label>
                <select 
                  className="input-premium" 
                  value={type} 
                  disabled={!!editingCat} // Cannot change type on edit
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="EXPENSE">Expense (Spendings)</option>
                  <option value="INCOME">Income (Earnings)</option>
                </select>
              </div>

              {/* Icon Selector Grid */}
              <div className="form-group">
                <label>Select Icon Shape</label>
                <div className="category-picker-grid">
                  {SELECTABLE_ICONS.map(ico => (
                    <div 
                      key={ico} 
                      className={`category-picker-item ${selectedIcon === ico ? 'selected' : ''}`}
                      onClick={() => setSelectedIcon(ico)}
                    >
                      <div className="category-picker-icon-wrap" style={{ color: selectedIcon === ico ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        <Icon name={ico} size={20} />
                      </div>
                      <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                        {ico}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Swatch Picker */}
              <div className="form-group">
                <label>Select Accent Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {PALETTE_COLORS.map(col => (
                    <button
                      type="button"
                      key={col}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: col,
                        border: selectedColor === col ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedColor(col)}
                    />
                  ))}
                  
                  {/* Native Color Picker for ultimate custom choice */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Custom:</span>
                    <input 
                      type="color" 
                      value={selectedColor} 
                      onChange={(e) => setSelectedColor(e.target.value)}
                      style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
