
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Employee, ActivityStatus, MapItem, MapItemType } from '../types';
import { getMapItems, saveMapItems } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface OfficeMapProps {
  employees: Employee[];
  activityStatuses: ActivityStatus[];
  currentUserRole: 'admin' | 'employee';
  onAssignSeat: (seatId: string, employeeId: string | null) => void;
}

const OfficeMap: React.FC<OfficeMapProps> = ({ employees, activityStatuses, currentUserRole, onAssignSeat }) => {
    const { addNotification } = useNotification();
    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [bgColor, setBgColor] = useState('#2c3e50'); // Default background
    
    // Dragging state
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragItem, setDragItem] = useState<string | null>(null); // ID of item being dragged
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Offset from item top-left to mouse

    useEffect(() => {
        const loadMap = async () => {
            try {
                const items = await getMapItems();
                setMapItems(items);
            } catch (error) {
                console.error("Failed to load map layout", error);
                addNotification("Failed to load map layout", 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadMap();
    }, []);

    const handleSaveLayout = async () => {
        try {
            await saveMapItems(mapItems);
            addNotification("Layout saved successfully", 'success');
            setIsEditMode(false);
            setSelectedItem(null);
        } catch (error) {
            console.error(error);
            addNotification("Failed to save layout", 'error');
        }
    };

    const handleAddItem = (type: MapItemType) => {
        const newItem: MapItem = {
            id: `new_${Date.now()}`,
            type,
            x: 50, // Center
            y: 50,
            rotation: 0,
            label: type === 'desk' ? 'New' : (type === 'meeting_table' ? 'Table' : undefined),
            width: type === 'wall' ? 10 : undefined, // Default wall length
            height: type === 'wall' ? 12 : undefined // Default wall thickness (in px approx)
        };
        setMapItems([...mapItems, newItem]);
        setSelectedItem(newItem);
    };

    const handleDeleteItem = () => {
        if (selectedItem) {
            setMapItems(mapItems.filter(i => i.id !== selectedItem.id));
            setSelectedItem(null);
        }
    };

    const handleRotateItem = () => {
        if (selectedItem) {
            const newRotation = ((selectedItem.rotation || 0) + 45) % 360;
            updateItem(selectedItem.id, { rotation: newRotation });
        }
    };

    const updateItem = (id: string, updates: Partial<MapItem>) => {
        setMapItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        if (selectedItem?.id === id) {
            setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    // --- Drag Logic ---

    const handleMouseDown = (e: React.MouseEvent, item: MapItem) => {
        if (!isEditMode || !containerRef.current) return;
        
        e.stopPropagation(); // Prevent map deselection logic
        setSelectedItem(item); // Select immediately on mouse down
        setIsDragging(true);
        setDragItem(item.id);

        const rect = containerRef.current.getBoundingClientRect();
        const itemX = (item.x / 100) * rect.width;
        const itemY = (item.y / 100) * rect.height;
        
        // Calculate click offset relative to item position to avoid jumping
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setDragOffset({
            x: mouseX - itemX,
            y: mouseY - itemY
        });
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !dragItem || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Apply offset
        let newXPct = ((mouseX - dragOffset.x) / rect.width) * 100;
        let newYPct = ((mouseY - dragOffset.y) / rect.height) * 100;

        // Clamp to bounds (0-100%)
        newXPct = Math.max(0, Math.min(100, newXPct));
        newYPct = Math.max(0, Math.min(100, newYPct));

        setMapItems(prev => prev.map(i => i.id === dragItem ? { ...i, x: newXPct, y: newYPct } : i));
    }, [isDragging, dragItem, dragOffset]);

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragItem(null);
    };

    // --- Rendering Helpers ---

    const getStatusColor = (status: string) => {
        if (status === 'Working') return '#91A673'; // lucius-lime
        if (status === 'Clocked Out') return '#9CA3AF'; // gray-400
        const custom = activityStatuses.find(s => s.name === status);
        return custom ? custom.color : '#AE8F60'; // wet-sand default
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // --- Item Renderers ---

    const renderMapItem = (item: MapItem) => {
        const isSelected = selectedItem?.id === item.id && isEditMode;
        
        // Common props for all items to handle selection properly
        const interactiveProps = {
            onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, item),
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation(); // Crucial: Stop click from hitting the background and deselecting
                if (!isEditMode && item.type === 'desk' && currentUserRole === 'admin') {
                    setSelectedItem(item);
                }
            }
        };

        const baseStyle: React.CSSProperties = {
            top: `${item.y}%`,
            left: `${item.x}%`,
            transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
            position: 'absolute',
            zIndex: item.type === 'wall' ? 1 : 10,
            cursor: isEditMode ? 'grab' : (item.type === 'desk' ? 'pointer' : 'default'),
            border: isSelected ? '2px solid #3B82F6' : 'none', // Blue selection border in edit mode
            boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
        };

        if (item.type === 'wall') {
            return (
                <div 
                    key={item.id} 
                    style={{ 
                        ...baseStyle, 
                        width: `${item.width || 10}%`, 
                        height: `${item.height || 12}px`, 
                        backgroundColor: '#34495e',
                        borderRadius: '2px'
                    }} 
                    {...interactiveProps}
                />
            );
        }

        if (item.type === 'locker') {
            return (
                <div 
                    key={item.id} 
                    style={{ ...baseStyle, width: '30px', height: '30px', backgroundColor: '#95a5a6' }}
                    className="rounded-sm flex items-center justify-center border border-gray-600 shadow-md"
                    {...interactiveProps}
                >
                    <div className="w-full h-[2px] bg-gray-600 mb-1"></div>
                    <div className="w-full h-[2px] bg-gray-600 mt-1"></div>
                </div>
            );
        }

        if (item.type === 'plant') {
            return (
                <div 
                    key={item.id} 
                    style={{ ...baseStyle, width: '40px', height: '40px' }}
                    {...interactiveProps}
                >
                    <div className="w-full h-full bg-green-600 rounded-full opacity-80 shadow-md border-2 border-green-800 flex items-center justify-center relative">
                        <div className="w-3/4 h-3/4 bg-green-500 rounded-full"></div>
                    </div>
                </div>
            );
        }

        if (item.type === 'camera') {
            return (
                <div 
                    key={item.id}
                    style={{ ...baseStyle }}
                    {...interactiveProps}
                >
                    <svg className="w-6 h-6 text-gray-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"></path></svg>
                </div>
            )
        }

        if (item.type === 'room_label') {
            return (
                <div 
                    key={item.id}
                    style={{ ...baseStyle, width: 'auto', height: 'auto', backgroundColor: 'transparent' }}
                    className="text-gray-400/50 font-display font-bold text-2xl uppercase tracking-widest whitespace-nowrap pointer-events-none select-none"
                    {...interactiveProps}
                >
                    {item.label || 'ROOM'}
                </div>
            )
        }

        if (item.type === 'meeting_table') {
             return (
                <div 
                    key={item.id} 
                    style={{ ...baseStyle, width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#d35400' }}
                    className="flex items-center justify-center border-4 border-[#a04000] shadow-lg text-[10px] text-white font-bold opacity-90 overflow-hidden"
                    {...interactiveProps}
                >
                    {item.label}
                </div>
            );
        }

        // Default: Desk
        const seatedEmployee = employees.find(e => e.seatId === item.id);
        const statusColor = seatedEmployee ? getStatusColor(seatedEmployee.status) : '#34495e';
        const isWorking = seatedEmployee?.status === 'Working';
        const isBreak = seatedEmployee && seatedEmployee.status !== 'Working' && seatedEmployee.status !== 'Clocked Out';

        return (
            <div
                key={item.id}
                {...interactiveProps}
                className={`absolute w-12 h-12 sm:w-16 sm:h-16 flex flex-col items-center justify-center transition-all duration-300 ${
                    isEditMode ? 'cursor-grab active:cursor-grabbing z-20' : 'cursor-pointer hover:scale-110 z-10'
                }`}
                style={baseStyle}
            >
                {/* Desk Graphic */}
                <div className={`w-full h-full rounded-lg shadow-lg relative border-2 ${isSelected ? 'border-blue-500' : 'border-[#1a252f]'}`} 
                     style={{ backgroundColor: '#ecf0f1' }}>
                    {/* Monitor */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gray-400 rounded-sm"></div>
                    
                    {seatedEmployee ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${isWorking ? 'animate-pulse' : ''}`} style={{ borderColor: statusColor }}>
                                {seatedEmployee.avatarUrl ? (
                                    <img src={seatedEmployee.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                                        {getInitials(seatedEmployee.name)}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white" style={{ backgroundColor: statusColor }}></div>
                                {isBreak && (
                                    <div className="absolute -top-4 -right-2 text-xs font-bold text-white animate-bounce drop-shadow-md">Zzz</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-[10px] font-mono select-none pointer-events-none">
                            {item.label}
                        </div>
                    )}
                </div>
                
                {seatedEmployee && (
                    <div className="absolute -bottom-6 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap backdrop-blur-sm z-30 pointer-events-none">
                        {seatedEmployee.name.split(' ')[0]}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) return <div className="p-8 text-center">Loading Map...</div>;

    return (
        <div className="w-full h-full flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-md border border-bokara-grey/10 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-bokara-grey">Office Map {isEditMode ? '(Editing)' : '(Live)'}</h2>
                    {!isEditMode && (
                        <div className="hidden sm:flex gap-2 text-xs">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-lucius-lime"></div> Working</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-wet-sand"></div> Pause</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div> Offline</div>
                        </div>
                    )}
                </div>
                {currentUserRole === 'admin' && (
                    <div className="flex items-center gap-2">
                        {isEditMode ? (
                            <>  
                                <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
                                    <label className="text-xs font-bold text-bokara-grey">Fondo:</label>
                                    <input 
                                        type="color" 
                                        value={bgColor} 
                                        onChange={(e) => setBgColor(e.target.value)} 
                                        className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                                    />
                                </div>
                                <button onClick={handleSaveLayout} className="px-4 py-2 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors shadow-sm">Save Layout</button>
                                <button onClick={() => { setIsEditMode(false); window.location.reload(); }} className="px-4 py-2 bg-gray-200 text-bokara-grey font-bold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditMode(true)} className="px-4 py-2 bg-bokara-grey text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                Edit Map
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-[600px] lg:h-[700px]">
                
                {/* Editor Toolbox (Only visible in Edit Mode) */}
                {isEditMode && (
                    <div className="w-full lg:w-48 bg-white p-4 rounded-xl shadow-md border border-bokara-grey/10 flex flex-col gap-4 overflow-y-auto">
                        <h3 className="font-bold text-sm text-bokara-grey uppercase tracking-wider">Toolbox</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleAddItem('desk')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <div className="w-6 h-6 border-2 border-gray-600 rounded bg-white"></div>
                                Desk
                            </button>
                            <button onClick={() => handleAddItem('wall')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <div className="w-8 h-2 bg-gray-800"></div>
                                Wall
                            </button>
                            <button onClick={() => handleAddItem('locker')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <div className="w-6 h-6 bg-gray-400 border border-gray-600"></div>
                                Locker
                            </button>
                            <button onClick={() => handleAddItem('meeting_table')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <div className="w-6 h-6 bg-orange-700 rounded-full"></div>
                                Table
                            </button>
                            <button onClick={() => handleAddItem('plant')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <div className="w-6 h-6 bg-green-600 rounded-full"></div>
                                Plant
                            </button>
                            <button onClick={() => handleAddItem('camera')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"></path></svg>
                                Camera
                            </button>
                            <button onClick={() => handleAddItem('room_label')} className="p-2 bg-gray-100 rounded hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium col-span-2">
                                <span className="font-bold text-gray-600">TEXT</span>
                                Label
                            </button>
                        </div>

                        {selectedItem && (
                            <div className="mt-auto border-t pt-4">
                                <h4 className="font-bold text-xs mb-2">Selected: {selectedItem.type}</h4>
                                <div className="flex flex-col gap-2">
                                    <button onClick={handleRotateItem} className="w-full py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100">Rotate 45°</button>
                                    
                                    {(selectedItem.type === 'desk' || selectedItem.type === 'meeting_table') && (
                                        <input 
                                            type="text" 
                                            value={selectedItem.label || ''} 
                                            onChange={(e) => updateItem(selectedItem.id, { label: e.target.value })}
                                            className="w-full border p-1 rounded text-xs" 
                                            placeholder="Label / Name"
                                        />
                                    )}
                                    {selectedItem.type === 'room_label' && (
                                        <input 
                                            type="text" 
                                            value={selectedItem.label || ''} 
                                            onChange={(e) => updateItem(selectedItem.id, { label: e.target.value })}
                                            className="w-full border p-1 rounded text-xs" 
                                            placeholder="Room Name"
                                        />
                                    )}
                                    {(selectedItem.type === 'wall') && (
                                        <div className="space-y-2 mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-500">Largo (Length)</span>
                                                <input 
                                                    type="range" 
                                                    min="2" max="50" 
                                                    value={selectedItem.width || 10} 
                                                    onChange={(e) => updateItem(selectedItem.id, { width: Number(e.target.value) })}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-500">Grosor (Thickness)</span>
                                                <input 
                                                    type="range" 
                                                    min="4" max="40" 
                                                    value={selectedItem.height || 12} 
                                                    onChange={(e) => updateItem(selectedItem.id, { height: Number(e.target.value) })}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={handleDeleteItem} className="w-full py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 mt-2">Delete Item</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Map Canvas */}
                <div 
                    ref={containerRef}
                    className="flex-grow relative rounded-xl shadow-inner border-4 border-[#34495e] overflow-hidden transition-colors duration-300" 
                    style={{
                        backgroundColor: bgColor,
                        backgroundImage: `radial-gradient(rgba(255,255,255,0.1) 10%, transparent 10%)`,
                        backgroundSize: '20px 20px',
                        cursor: isEditMode ? 'crosshair' : 'default'
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={() => { if(isEditMode) setSelectedItem(null); }}
                >
                    {mapItems.map(renderMapItem)}
                </div>
            </div>

            {/* Assignment Modal (View Mode Only) */}
            {!isEditMode && selectedItem && selectedItem.type === 'desk' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-bokara-grey mb-4">Assign Seat {selectedItem.label}</h3>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            <button 
                                onClick={() => { onAssignSeat(selectedItem.id, null); setSelectedItem(null); }}
                                className="w-full text-left p-3 rounded-lg hover:bg-red-50 text-red-600 font-bold border border-transparent hover:border-red-100 flex justify-between items-center"
                            >
                                Empty Seat
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            {employees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => { onAssignSeat(selectedItem.id, emp.id); setSelectedItem(null); }}
                                    className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${
                                        emp.seatId === selectedItem.id 
                                            ? 'bg-lucius-lime/10 border border-lucius-lime text-bokara-grey' 
                                            : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                        {getInitials(emp.name)}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-sm">{emp.name}</p>
                                        {emp.seatId && emp.seatId !== selectedItem.id && (
                                            <p className="text-xs text-gray-400">Currently at {mapItems.find(d => d.id === emp.seatId)?.label || 'another desk'}</p>
                                        )}
                                    </div>
                                    {emp.seatId === selectedItem.id && <div className="w-2 h-2 rounded-full bg-lucius-lime"></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeMap;
