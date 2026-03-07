'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { SeatingPlanData, TableWithGuests } from '@/types/api';
import type { LayoutElement } from '@/types/models';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';

interface SeatingLayoutProps {
  data: SeatingPlanData;
  onUpdate: () => void;
  apiBase?: string;
}

export function SeatingLayout({ data, onUpdate, apiBase = '/api/admin/seating' }: SeatingLayoutProps) {
  const t = useTranslations();
  const [tables, setTables] = useState<TableWithGuests[]>(data.tables);
  const [elements, setElements] = useState<LayoutElement[]>(data.layout_elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'none' | 'table' | 'element' | 'draw' | 'text' | 'guest'>('none');
  const [draggedGuest, setDraggedGuest] = useState<{ tableId: string; guestId: string } | null>(null);
  const [showNames, setShowNames] = useState(true);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const viewBox = { x: 0, y: 0, w: 1200, h: 800 };

  useEffect(() => {
    setTables(data.tables);
    setElements(data.layout_elements || []);
  }, [data.tables, data.layout_elements]);

  const getSvgCoords = (e: React.PointerEvent | PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Capture pointer to ensure move/up events continue even if leaving the element
    (e.target as Element).setPointerCapture(e.pointerId);
    
    const coords = getSvgCoords(e);
    
    if (dragMode === 'draw') {
      setCurrentLine({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
      return;
    }

    if (dragMode === 'text') {
      const newText: LayoutElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        text: t('admin.seating.layout.textPlaceholder'),
        x: coords.x,
        y: coords.y,
        fontSize: 16,
        color: '#374151'
      };
      setElements([...elements, newText]);
      setSelectedId(newText.id);
      setDragMode('none');
      return;
    }

    // Check if clicked a table
    const tableClicked = tables.find(t => {
      const type = t.type || 'circle';
      const width = t.width || (type === 'rectangle' ? 120 : 80);
      const height = t.height || (type === 'rectangle' ? 60 : 80);
      const x = t.x ?? 0;
      const y = t.y ?? 0;
      if (type === 'circle') {
        const dist = Math.sqrt(Math.pow(coords.x - x, 2) + Math.pow(coords.y - y, 2));
        return dist < width/2;
      } else {
        return coords.x >= x - width/2 && coords.x <= x + width/2 && coords.y >= y - height/2 && coords.y <= y + height/2;
      }
    });

    if (tableClicked) {
      setSelectedId(tableClicked.id);
      setDragStart({ x: coords.x - (tableClicked.x || 0), y: coords.y - (tableClicked.y || 0) });
      setDragMode('table');
      return;
    }

    // Check if clicked an element
    const elementClicked = elements.find(el => {
      if (el.type === 'text') {
        return Math.abs(coords.x - (el.x || 0)) < 50 && Math.abs(coords.y - (el.y || 0)) < 15;
      }
      return false; // Line selection is harder
    });

    if (elementClicked) {
      setSelectedId(elementClicked.id);
      setDragStart({ x: coords.x - (elementClicked.x || 0), y: coords.y - (elementClicked.y || 0) });
      setDragMode('element');
      return;
    }

    setSelectedId(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'none') return;
    const coords = getSvgCoords(e);

    if (dragMode === 'draw' && currentLine) {
      setCurrentLine({ ...currentLine, x2: coords.x, y2: coords.y });
    } else if (dragMode === 'table' && selectedId && dragStart) {
      setTables(tables.map(t => 
        t.id === selectedId ? { ...t, x: coords.x - dragStart.x, y: coords.y - dragStart.y } : t
      ));
    } else if (dragMode === 'element' && selectedId && dragStart) {
      setElements(elements.map(el => 
        el.id === selectedId ? { ...el, x: coords.x - dragStart.x, y: coords.y - dragStart.y } : el
      ));
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    const coords = getSvgCoords(e);

    if (dragMode === 'guest' && draggedGuest) {
      // Find if we dropped over another guest in the same table
      const targetTable = tables.find(t => t.id === draggedGuest.tableId);
      if (targetTable) {
        // Find which guest we dropped on
        // We need to re-calculate their positions or use a hit-test
        // For simplicity, we'll check proximity to all guests in that table
        const width = targetTable.width || (targetTable.type === 'rectangle' ? 120 : 80);
        const height = targetTable.height || (targetTable.type === 'rectangle' ? 60 : 80);
        
        let targetGuestId: string | null = null;
        
        targetTable.assigned_guests.forEach((g, i) => {
          if (g.id === draggedGuest.guestId) return;
          
          // Calculate this guest's position relative to table center
          let gx = 0, gy = 0;
          const guestCount = targetTable.assigned_guests.length;
          const type = targetTable.type || 'circle';

          if (type === 'circle') {
            const angle = (i / guestCount) * 2 * Math.PI - Math.PI / 2;
            gx = Math.cos(angle) * (width/2 + 10);
            gy = Math.sin(angle) * (width/2 + 10);
          } else if (type === 'rectangle') {
            if (i === 0) { gx = -width/2 - 12; gy = 0; }
            else if (i === 1) { gx = width/2 + 12; gy = 0; }
            else {
              const remaining = guestCount - 2;
              const onTop = Math.ceil(remaining / 2);
              const idx = i - 2;
              if (idx < onTop) {
                const spacing = (width - 20) / (onTop > 1 ? onTop - 1 : 1);
                gx = (onTop > 1) ? (-width/2 + 10 + idx * spacing) : 0;
                gy = -height/2 - 12;
              } else {
                const onBottom = remaining - onTop;
                const bIdx = idx - onTop;
                const spacing = (width - 20) / (onBottom > 1 ? onBottom - 1 : 1);
                gx = (onBottom > 1) ? (-width/2 + 10 + bIdx * spacing) : 0;
                gy = height/2 + 12;
              }
            }
          } else { // Square
            const perSide = Math.ceil(guestCount / 4);
            const side = Math.floor(i / perSide);
            const sIdx = i % perSide;
            const spacing = (width - 20) / (perSide > 1 ? perSide - 1 : 1);
            const offset = (perSide > 1) ? (-width/2 + 10 + sIdx * spacing) : 0;
            if (side === 0) { gx = offset; gy = -height/2 - 12; }
            else if (side === 1) { gx = width/2 + 12; gy = offset; }
            else if (side === 2) { gx = offset; gy = height/2 + 12; }
            else { gx = -width/2 - 12; gy = offset; }
          }

          // Transform back to global SVG space
          // This is a simplified hit test
          const tableX = targetTable.x ?? 0;
          const tableY = targetTable.y ?? 0;
          const dist = Math.sqrt(Math.pow(coords.x - (tableX + gx), 2) + Math.pow(coords.y - (tableY + gy), 2));
          if (dist < 20) {
            targetGuestId = g.id;
          }
        });

        if (targetGuestId) {
          // Swap them
          const newGuests = [...targetTable.assigned_guests];
          const idx1 = newGuests.findIndex(g => g.id === draggedGuest.guestId);
          const idx2 = newGuests.findIndex(g => g.id === targetGuestId);
          if (idx1 !== -1 && idx2 !== -1) {
            [newGuests[idx1], newGuests[idx2]] = [newGuests[idx2], newGuests[idx1]];
            setTables(tables.map(t => t.id === targetTable.id ? { ...t, assigned_guests: newGuests } : t));
            
            // Save to DB
            try {
              await fetch(apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assignments: newGuests.map((g, i) => ({
                    guest_id: g.id,
                    table_id: targetTable.id,
                    seat_index: i
                  }))
                })
              });
            } catch (err) { console.error(err); }
          }
        }
      }
      setDraggedGuest(null);
    }

    if (dragMode === 'draw' && currentLine) {
      const newLine: LayoutElement = {
        id: `line-${Date.now()}`,
        type: 'line',
        x1: currentLine.x1,
        y1: currentLine.y1,
        x2: currentLine.x2,
        y2: currentLine.y2,
        color: '#9CA3AF',
        size: 2
      };
      setElements([...elements, newLine]);
      setCurrentLine(null);
    }
    if (dragMode !== 'draw' && dragMode !== 'text') {
      setDragMode('none');
    }
    setDragStart(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(elements.filter(el => el.id !== selectedId));
    // If it's a table, we just "unplace" it by setting x,y to null
    setTables(tables.map(t => t.id === selectedId ? { ...t, x: null, y: null } : t));
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout_elements: elements,
          tables: tables.map(t => ({
            id: t.id,
            x: t.x,
            y: t.y,
            rotation: t.rotation,
            color: t.color,
            width: t.width,
            height: t.height
          }))
        })
      });
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!canvasContainerRef.current) return;

    try {
      const canvas = await html2canvas(canvasContainerRef.current);
      const imgData = canvas.toDataURL('image/png');

      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Layout Image
      const sheet1 = workbook.addWorksheet('Layout');
      const imageId = workbook.addImage({
        base64: imgData,
        extension: 'png',
      });
      sheet1.addImage(imageId, {
        tl: { col: 1, row: 1 },
        ext: { width: canvas.width / 2, height: canvas.height / 2 }
      });

      // Sheet 2: Guest List
      const sheet2 = workbook.addWorksheet('Guests per Table');
      sheet2.columns = [
        { header: t('admin.seating.config.tableName'), key: 'tableName', width: 20 },
        { header: 'Guest Name', key: 'guestName', width: 30 },
        { header: 'Family', key: 'familyName', width: 30 },
        { header: 'Dietary', key: 'dietary', width: 30 },
      ];

      tables.forEach(table => {
        table.assigned_guests.forEach(guest => {
          sheet2.addRow({
            tableName: table.name || `${t('admin.seating.config.tableNumber')} ${table.number}`,
            guestName: guest.name,
            familyName: guest.family_name,
            dietary: guest.dietary_restrictions || ''
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `seating-layout-${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedId),
    [tables, selectedId]
  );

  const selectedElement = useMemo(() => 
    elements.find(el => el.id === selectedId),
    [elements, selectedId]
  );

  const moveGuest = async (tableId: string, guestId: string, direction: 'up' | 'down') => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const guests = [...table.assigned_guests];
    const index = guests.findIndex(g => g.id === guestId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [guests[index], guests[index - 1]] = [guests[index - 1], guests[index]];
    } else if (direction === 'down' && index < guests.length - 1) {
      [guests[index], guests[index + 1]] = [guests[index + 1], guests[index]];
    } else {
      return;
    }

    // Update local state
    setTables(tables.map(t => t.id === tableId ? { ...t, assigned_guests: guests } : t));

    // Save assignments immediately or wait for explicit save? 
    // The requirement says "individuals seating in that table can be positioned in the table as you wish"
    // We'll update the seat_index via API
    try {
      await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: guests.map((g, i) => ({
            guest_id: g.id,
            table_id: tableId,
            seat_index: i
          }))
        })
      });
    } catch (error) {
      console.error('Error updating guest positions:', error);
    }
  };

  const renderTable = (table: TableWithGuests) => {
    const isSelected = selectedId === table.id;
    const x = table.x ?? 0;
    const y = table.y ?? 0;
    const type = table.type || 'circle';
    
    // Size logic
    const width = table.width || (type === 'rectangle' ? 120 : 80);
    const height = table.height || (type === 'rectangle' ? 60 : 80);
    const color = table.color || '#ffffff';

    const guests = table.assigned_guests;
    const guestCount = guests.length;

    return (
      <g key={table.id} transform={`translate(${x}, ${y}) rotate(${table.rotation || 0})`}>
        {type === 'circle' ? (
          <circle 
            r={width/2} 
            fill={color} 
            stroke={isSelected ? '#8B5CF6' : '#D1D5DB'} 
            strokeWidth={isSelected ? 3 : 2}
            className="cursor-move shadow-sm"
          />
        ) : (
          <rect 
            x={-width/2} 
            y={-height/2} 
            width={width} 
            height={height} 
            fill={color} 
            stroke={isSelected ? '#8B5CF6' : '#D1D5DB'} 
            strokeWidth={isSelected ? 3 : 2}
            className="cursor-move shadow-sm"
            rx={4}
          />
        )}
        <text 
          textAnchor="middle" 
          dy=".3em" 
          className="select-none font-bold text-sm pointer-events-none"
          fill="#1F2937"
          stroke="white"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {table.name || table.number}
        </text>
        
        {/* Render small dots for guests around the table */}
        {guests.map((g, i) => {
          let gx = 0, gy = 0;
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          let tx = 0, ty = 0;

          if (type === 'circle') {
            const angle = (i / guestCount) * 2 * Math.PI - Math.PI / 2;
            gx = Math.cos(angle) * (width/2 + 10);
            gy = Math.sin(angle) * (width/2 + 10);
            tx = Math.cos(angle) * (width/2 + 25);
            ty = Math.sin(angle) * (width/2 + 25);
            textAnchor = Math.abs(angle) < Math.PI/2 ? 'start' : 'end';
          } else if (type === 'rectangle') {
            // Logic: 1 on each short side (left/right), the rest distributed on long sides (top/bottom)
            // We assume short sides are indices 0 and 1, or we split them
            if (i === 0) { // Left short side
              gx = -width/2 - 12; gy = 0;
              tx = gx - 8; ty = gy + 4; textAnchor = 'end';
            } else if (i === 1) { // Right short side
              gx = width/2 + 12; gy = 0;
              tx = gx + 8; ty = gy + 4; textAnchor = 'start';
            } else {
              // The rest on top and bottom
              const remaining = guestCount - 2;
              const onTop = Math.ceil(remaining / 2);
              const idx = i - 2;
              if (idx < onTop) { // Top long side
                const spacing = (width - 20) / (onTop > 1 ? onTop - 1 : 1);
                gx = (onTop > 1) ? (-width/2 + 10 + idx * spacing) : 0;
                gy = -height/2 - 12;
                tx = gx; ty = gy - 10; textAnchor = 'middle';
              } else { // Bottom long side
                const onBottom = remaining - onTop;
                const bIdx = idx - onTop;
                const spacing = (width - 20) / (onBottom > 1 ? onBottom - 1 : 1);
                gx = (onBottom > 1) ? (-width/2 + 10 + bIdx * spacing) : 0;
                gy = height/2 + 12;
                tx = gx; ty = gy + 18; textAnchor = 'middle';
              }
            }
          } else { // Square
            const perSide = Math.ceil(guestCount / 4);
            const side = Math.floor(i / perSide);
            const sIdx = i % perSide;
            const spacing = (width - 20) / (perSide > 1 ? perSide - 1 : 1);
            const offset = (perSide > 1) ? (-width/2 + 10 + sIdx * spacing) : 0;
            
            if (side === 0) { gx = offset; gy = -height/2 - 12; tx = gx; ty = gy - 10; textAnchor = 'middle'; }
            else if (side === 1) { gx = width/2 + 12; gy = offset; tx = gx + 8; ty = gy + 4; textAnchor = 'start'; }
            else if (side === 2) { gx = offset; gy = height/2 + 12; tx = gx; ty = gy + 18; textAnchor = 'middle'; }
            else { gx = -width/2 - 12; gy = offset; tx = gx - 8; ty = gy + 4; textAnchor = 'end'; }
          }
          
          return (
            <g 
              key={g.id} 
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggedGuest({ tableId: table.id, guestId: g.id });
                setDragMode('guest');
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
            >
              <circle cx={gx} cy={gy} r={8} fill={draggedGuest?.guestId === g.id ? '#4F46E5' : '#8B5CF6'} />
              {showNames && (
                <text 
                  x={tx} y={ty} 
                  fontSize="10" 
                  textAnchor={textAnchor}
                  className="pointer-events-none select-none fill-gray-600"
                  transform={`rotate(${- (table.rotation || 0)}, ${tx}, ${ty})`}
                >
                  {g.name}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
      {/* Sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-4 overflow-y-auto pr-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('admin.seating.layout.canvasActions.save')}
          </button>
          <button
            onClick={handleExport}
            className="w-full py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
          >
            {t('admin.seating.layout.canvasActions.export')}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-2">{t('admin.seating.layout.unplacedTables')}</h4>
          <div className="flex flex-wrap gap-2">
            {tables.filter(t => t.x === null).map(table => (
              <button
                key={table.id}
                onClick={() => {
                  setTables(tables.map(t => t.id === table.id ? { ...t, x: viewBox.w/2, y: viewBox.h/2 } : t));
                  setSelectedId(table.id);
                }}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
              >
                {table.name || table.number}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-3">{t('admin.seating.layout.canvasActions.title' as never) || 'Tools'}</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDragMode(dragMode === 'draw' ? 'none' : 'draw')}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${dragMode === 'draw' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {t('admin.seating.layout.canvasActions.drawLine')}
            </button>
            <button
              onClick={() => setDragMode(dragMode === 'text' ? 'none' : 'text')}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${dragMode === 'text' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {t('admin.seating.layout.canvasActions.addText')}
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedId}
              className="px-3 py-2 bg-white text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {t('admin.seating.layout.canvasActions.delete')}
            </button>
            <button
              onClick={() => { if(confirm(t('admin.seating.layout.canvasActions.clear' as never) || 'Clear all?')) setElements([]); }}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              {t('admin.seating.layout.canvasActions.clear')}
            </button>
          </div>
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="showNames"
              checked={showNames}
              onChange={(e) => setShowNames(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="showNames" className="ml-2 block text-sm text-gray-900 cursor-pointer">
              {t('admin.seating.layout.showNames' as never) || 'Show Guest Names'}
            </label>
          </div>
        </div>

        {selectedTable && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-gray-900">{selectedTable.name || selectedTable.number}</h4>
                <p className="text-xs text-gray-500">{selectedTable.assigned_guests.length} / {selectedTable.capacity} guests</p>
              </div>
              <button
                onClick={() => {
                  setTables(tables.map(t => t.id === selectedTable.id ? { ...t, rotation: ((t.rotation || 0) + 90) % 360 } : t));
                }}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                title={t('admin.seating.layout.canvasActions.rotate' as never) || 'Rotate 90°'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 p-2 bg-gray-50 rounded-md">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Color</label>
                <input 
                  type="color" 
                  value={selectedTable.color || '#ffffff'} 
                  onChange={(e) => setTables(tables.map(t => t.id === selectedTable.id ? { ...t, color: e.target.value } : t))}
                  className="w-full h-8 p-0 border-none bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Size (W/H)</label>
                <div className="flex gap-1">
                  <input 
                    type="number" 
                    value={selectedTable.width || 80} 
                    onChange={(e) => setTables(tables.map(t => t.id === selectedTable.id ? { ...t, width: parseInt(e.target.value) } : t))}
                    className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                    placeholder="W"
                  />
                  <input 
                    type="number" 
                    value={selectedTable.height || 80} 
                    onChange={(e) => setTables(tables.map(t => t.id === selectedTable.id ? { ...t, height: parseInt(e.target.value) } : t))}
                    className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                    placeholder="H"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {selectedTable.assigned_guests.map((guest, idx) => (
                <div key={guest.id} className="flex items-center justify-between text-sm p-1 hover:bg-gray-50 rounded">
                  <span className="truncate flex-1" title={guest.name}>{guest.name}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => moveGuest(selectedTable.id, guest.id, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:text-purple-600 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button 
                      onClick={() => moveGuest(selectedTable.id, guest.id, 'down')}
                      disabled={idx === selectedTable.assigned_guests.length - 1}
                      className="p-1 hover:text-purple-600 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedElement && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-3 uppercase text-[10px] tracking-wider border-b pb-1">
              {selectedElement.type === 'text' ? 'Text Properties' : 'Line Properties'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Color</label>
                <input 
                  type="color" 
                  value={selectedElement.color || (selectedElement.type === 'text' ? '#374151' : '#9CA3AF')} 
                  onChange={(e) => setElements(elements.map(el => el.id === selectedElement.id ? { ...el, color: e.target.value } : el))}
                  className="w-full h-8 p-0 border-none bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">
                  {selectedElement.type === 'text' ? 'Font Size' : 'Thickness'}
                </label>
                <input 
                  type="number" 
                  value={selectedElement.type === 'text' ? (selectedElement.fontSize || 16) : (selectedElement.size || 2)} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setElements(elements.map(el => 
                      el.id === selectedElement.id ? 
                        (el.type === 'text' ? { ...el, fontSize: val } : { ...el, size: val }) : 
                        el
                    ));
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-white border border-gray-200 rounded-lg shadow-inner overflow-hidden relative cursor-crosshair bg-grid-slate-100"
        style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Elements (Lines, Text) */}
          {elements.map(el => (
            <g key={el.id}>
              {el.type === 'line' ? (
                <line 
                  x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                  stroke={el.color || '#9CA3AF'} 
                  strokeWidth={el.size || 2} 
                  className={selectedId === el.id ? 'stroke-purple-600' : ''}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                />
              ) : (
                <text
                  x={el.x} y={el.y}
                  fill={el.color || '#374151'}
                  fontSize={el.fontSize || 16}
                  className={`cursor-pointer select-none ${selectedId === el.id ? 'fill-purple-600 font-bold' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                  onDoubleClick={() => {
                    const newText = prompt('Enter text:', el.text);
                    if (newText !== null) {
                      setElements(elements.map(item => item.id === el.id ? { ...item, text: newText } : item));
                    }
                  }}
                >
                  {el.text}
                </text>
              )}
            </g>
          ))}

          {/* Current drawing line */}
          {currentLine && (
            <line 
              x1={currentLine.x1} y1={currentLine.y1} x2={currentLine.x2} y2={currentLine.y2} 
              stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5,5" 
            />
          )}

          {/* Tables */}
          {tables.filter(t => t.x !== null && t.y !== null).map(renderTable)}
        </svg>

        {/* Legend / Tooltips */}
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200 text-xs text-gray-500 pointer-events-none">
          Drag tables to position • Double-click text to edit • Select and press delete to remove
        </div>
      </div>
    </div>
  );
}
