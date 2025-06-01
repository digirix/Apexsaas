import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Home, Building2, ChevronDown } from "lucide-react";

interface Entity {
  id: number;
  name: string;
  entityType?: string;
}

interface EntityFilterDropdownProps {
  entities: Entity[];
  selectedEntityId?: number | null;
  onEntitySelect: (entityId: number | null) => void;
}

export function EntityFilterDropdown({ entities, selectedEntityId, onEntitySelect }: EntityFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleEntitySelect = useCallback((entityId: number) => {
    setIsOpen(false);
    onEntitySelect(entityId);
  }, [onEntitySelect]);

  const handleAllEntities = useCallback(() => {
    setIsOpen(false);
    onEntitySelect(null);
  }, [onEntitySelect]);

  const selectedEntity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  return (
    <div className="relative min-w-[280px]" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="w-full bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg rounded-xl px-4 py-2 h-10 hover:bg-white/90 transition-all duration-300 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        type="button"
      >
        <span className="text-slate-600 text-sm">
          {selectedEntity ? selectedEntity.name : "All Entities"}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-2xl rounded-xl mt-1 z-[9999] max-h-60 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={handleAllEntities}
              className="w-full flex items-center space-x-2 p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors text-left focus:outline-none focus:bg-blue-50"
              type="button"
            >
              <Home className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-medium">All Entities</span>
            </button>
            
            {Array.isArray(entities) && entities.map((entity) => (
              entity && entity.id && entity.name ? (
                <button
                  key={entity.id}
                  onClick={() => handleEntitySelect(entity.id)}
                  className="w-full flex items-center space-x-2 p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors text-left focus:outline-none focus:bg-blue-50"
                  type="button"
                >
                  <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-sm">{entity.name}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full ml-auto">
                    {entity.entityType || 'Unknown'}
                  </span>
                </button>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}