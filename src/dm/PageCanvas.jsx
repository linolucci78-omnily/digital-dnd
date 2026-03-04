// ═══════════════════════════════════════════════════════════
//  PageCanvas — Canvas Interattivo PROFESSIONALE
//  Features: Drag & Drop, Resize, Rotate, Pan, Zoom, Layers
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stage, Layer, Image as KonvaImage, Rect, Line, Circle, Transformer, Text as KonvaText, Group } from "react-konva";
import { supabase } from "../lib/supabase";
import useImage from "use-image";
import Modal from "../components/Modal";
import { GiScrollQuill, GiWoodPile, GiCrossedSwords, GiEvilEyes, GiBorderedShield, GiTabletopPlayers } from "react-icons/gi";
import { FaEraser, FaUsers, FaChessBoard } from "react-icons/fa";
import { BsGrid3X3 } from "react-icons/bs";

const PageCanvas = forwardRef(function PageCanvas({
  scene,
  campaign,
  onUpdate,
  onSave,  // Callback to save canvas state
  mode = "edit",  // "edit" (DM) | "view" (players/TV) | "exploration" | "combat"
  tvChannel = null,
  session = null,
  combatData = null  // { turnOrder, currentTurn, round } - active only in combat mode
}, ref) {
  // mode:
  //   - "edit": DM editing mode (default)
  //   - "view": TV/Player view mode
  //   - "exploration": DM exploration mode (same as edit but different semantics)
  //   - "combat": Combat mode with turn-based restrictions
  // tvChannel: Supabase realtime channel per broadcasting
  // campaign: Campaign object (needed for TV URL)
  // combatData: Combat state (turn order, current turn, round number)

  // Canvas & Stage
  const [canvasSize] = useState({ width: 5000, height: 3500 });
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const stageContainerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const initialFitDoneRef = useRef({}); // Track per-mode
  const isTransitioningRef = useRef(false); // Track scene transitions

  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({
    width: 800,
    height: 600,
  });

  // Tool Mode
  const [tool, setTool] = useState("select");
  // Tools: "select", "pan", "draw", "line", "rectangle", "circle", "text", "ruler", "ping"

  // Drawing Tool State
  const [drawColor, setDrawColor] = useState("#d4af37");
  const [drawWidth, setDrawWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState(null);

  // Grid Alignment Tool
  const [gridAlignMode, setGridAlignMode] = useState(false);
  const [alignStart, setAlignStart] = useState(null);
  const [alignEnd, setAlignEnd] = useState(null);

  // Scene transition effect (DISABLED - was causing performance issues)
  // const [sceneTransitioning, setSceneTransitioning] = useState(false);

  // Fog of War Tool
  const [fogRevealStart, setFogRevealStart] = useState(null);
  const [fogMode, setFogMode] = useState("rect"); // "rect" | "brush" | "polygon" | "hide"
  const [fogBrushSize, setFogBrushSize] = useState(60);
  const [fogPolygonPoints, setFogPolygonPoints] = useState([]);

  // Ruler Tool
  const [rulerStart, setRulerStart] = useState(null);
  const [rulerEnd, setRulerEnd] = useState(null);

  // Ping Tool
  const [pingPosition, setPingPosition] = useState(null);

  // Text Tool
  const [textInput, setTextInput] = useState(null); // {x, y, text}

  // UI State
  const [showDrawingMenu, setShowDrawingMenu] = useState(false);

  // Undo/Redo System
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState([]); // array of {id, layer}

  // Selection & Transform
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);

  // Pan & Zoom
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // View mode: misura distanza + coordinate cursore
  const [viewMeasure, setViewMeasure] = useState(null); // { startX, startY, endX, endY }
  const [cursorGridPos, setCursorGridPos] = useState(null); // { col, row }
  const lastCursorUpdate = useRef(0); // Throttle cursor position updates
  const [stageScale, setStageScale] = useState(1);
  const [isLoadingScene, setIsLoadingScene] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(true);

  // Context Menu
  const [contextMenu, setContextMenu] = useState(null);

  // Set image as main map
  const setAsMainMap = (layerName, objectId) => {
    const obj = layers[layerName].objects.find(o => o.id === objectId);
    if (obj && layerName === "map") {
      setPageSettings(prev => ({
        ...prev,
        mapImage: {
          url: obj.url,
          width: obj.width,
          height: obj.height,
          x: obj.x,
          y: obj.y,
        }
      }));
      // Enable grid automatically when main map is set
      setGridSettings(prev => ({ ...prev, enabled: true }));
      setContextMenu(null);
      console.log("Set as main map - grid enabled and covering this image area");
    }
  };

  // Clear main map
  const clearMainMap = () => {
    setPageSettings(prev => ({
      ...prev,
      mapImage: null,
    }));
    console.log("Main map cleared - grid back to full canvas");
  };

  // Start grid alignment mode
  const startGridAlignment = () => {
    setGridAlignMode(true);
    setAlignStart(null);
    setAlignEnd(null);
    setTool("select");
  };

  // Apply grid alignment based on 3x3 traced area
  const applyGridAlignment = () => {
    if (!alignStart || !alignEnd || !pageSettings.mapImage) {
      setGridAlignMode(false);
      return;
    }

    const width = Math.abs(alignEnd.x - alignStart.x);
    const height = Math.abs(alignEnd.y - alignStart.y);

    // Calculate grid size from 3x3 square
    const newGridSize = Math.round((width + height) / 6); // average of width/3 and height/3

    // Calculate offset
    const offsetX = Math.min(alignStart.x, alignEnd.x) % newGridSize;
    const offsetY = Math.min(alignStart.y, alignEnd.y) % newGridSize;

    setGridSettings(prev => ({
      ...prev,
      size: newGridSize,
      offsetX: offsetX,
      offsetY: offsetY,
    }));

    setGridAlignMode(false);
    setAlignStart(null);
    setAlignEnd(null);

    console.log(`Grid aligned: ${newGridSize}px, offset (${Math.round(offsetX)}, ${Math.round(offsetY)})`);
  };

  // Snap coordinate to grid
  const snapToGrid = (value, gridSize, offset = 0) => {
    if (!gridSettings.snapToGrid) return value;
    return Math.round((value - offset) / gridSize) * gridSize + offset;
  };

  // Toggle Fog of War
  const toggleFogOfWar = () => {
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        enabled: !prev.fogOfWar.enabled,
      }
    }));
  };

  // Clear all fog
  const clearAllFog = () => {
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        revealedAreas: [],
        hiddenAreas: [],
      }
    }));
  };

  // Reveal all — tutto visibile (rimuove tutte le aree nascoste)
  const revealAllFog = () => {
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        hiddenAreas: [],
      }
    }));
  };

  // Hide all — nascondi tutta la mappa
  const hideAllFog = () => {
    if (!pageSettings.mapImage) return;
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        hiddenAreas: [{
          type: "rect",
          x: pageSettings.mapImage.x || 0,
          y: pageSettings.mapImage.y || 0,
          width: pageSettings.mapImage.width,
          height: pageSettings.mapImage.height
        }],
      }
    }));
  };

  // Reveal fog area (rect, circle, or polygon)
  const revealFogArea = (shape) => {
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        revealedAreas: [...(prev.fogOfWar.revealedAreas || []), shape],
      }
    }));
  };

  // Hide fog area (re-fog a revealed area)
  const hideFogArea = (shape) => {
    setPageSettings(prev => ({
      ...prev,
      fogOfWar: {
        ...prev.fogOfWar,
        hiddenAreas: [...(prev.fogOfWar.hiddenAreas || []), shape],
      }
    }));
  };

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null); // { file, clientX, clientY }

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Layer System
  const [currentLayer, setCurrentLayer] = useState("map");
  const [layers, setLayers] = useState({
    map: { visible: true, locked: false, objects: [] },
    objects: { visible: true, locked: false, objects: [] },
    tokens: { visible: true, locked: false, objects: [] },
    gm: { visible: true, locked: false, objects: [] },
  });

  // Grid Settings
  const [gridSettings, setGridSettings] = useState({
    enabled: false, // Disabled by default until main map is set
    type: "square",
    size: 100,
    color: "#d4af37",
    opacity: 0.45,
    snapToGrid: true, // Enabled by default for easier object placement
    offsetX: 0,
    offsetY: 0,
    scale: 5, // feet per square
    scaleUnit: "ft",
  });

  // Page Settings
  const [pageSettings, setPageSettings] = useState({
    backgroundColor: "#1a1410",
    mapImage: null, // { url, width, height, x, y } - Main map that defines page bounds
    pageWidth: 25, // in grid units
    pageHeight: 25, // in grid units
    fogOfWar: {
      enabled: false,
      revealedAreas: [], // Array of {x, y, width, height} rectangles
    },
  });

  // Collapsible Sections
  const [collapsedSections, setCollapsedSections] = useState({
    tools: false,
    layers: false,
    grid: true,
    page: true,
    characters: false, // Player characters section - APERTA di default
    npcs: true, // NPC library section - chiusa di default
  });

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Player Characters Library
  const [characters, setCharacters] = useState([]);

  // NPC Library
  const [npcs, setNpcs] = useState([]);

  // Token Editor Modal
  const [tokenEditorModal, setTokenEditorModal] = useState({
    isOpen: false,
    character: null,
    config: {
      size: "medium", // small, medium, large
      showHPBar: true,
      showName: true,
      showACBadge: true,
      borderStyle: "solid", // solid, double, glow
    },
  });

  // Drag highlight cell
  const [dragHighlightCell, setDragHighlightCell] = useState(null);
  const lastHighlightCellRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  //  AUTO-SAVE & BROADCASTING SYSTEM (Better than Roll20!)
  // ═══════════════════════════════════════════════════════════

  // Load canvas state from database on mount
  useEffect(() => {
    if (!scene?.id) return;

    // Hide zoom controls during transition
    setShowZoomControls(false);

    // Trigger fade-out transition
    isTransitioningRef.current = true;
    // setSceneTransitioning(true); // DISABLED

    const loadCanvasState = async () => {
      try {
        const { data, error } = await supabase
          .from("scenes")
          .select("canvas_state")
          .eq("id", scene.id)
          .single();

        if (error) throw error;

        if (data?.canvas_state) {
          const state = data.canvas_state;

          // Batch all state updates together to minimize re-renders
          React.startTransition(() => {
            // Restore layers
            if (state.layers) {
              setLayers(state.layers);
            }

            // Restore grid settings
            if (state.gridSettings) {
              setGridSettings(state.gridSettings);
              console.log("Grid settings loaded:", state.gridSettings);
            }

            // Restore page settings
            if (state.pageSettings) {
              setPageSettings(state.pageSettings);

              // Auto-align grid to map if offsets are at default (0,0) and map exists
              if (state.pageSettings.mapImage && state.gridSettings &&
                  state.gridSettings.offsetX === 0 && state.gridSettings.offsetY === 0) {
                const map = state.pageSettings.mapImage;
                const alignedOffsetX = (map.x || 0) % state.gridSettings.size;
                const alignedOffsetY = (map.y || 0) % state.gridSettings.size;

                setGridSettings(prev => ({
                  ...prev,
                  offsetX: alignedOffsetX,
                  offsetY: alignedOffsetY
                }));
                console.log("Grid auto-aligned to map:", { alignedOffsetX, alignedOffsetY });
              }
            }

            console.log("Canvas state loaded from database");
          });
        }

        // Fade back in after loading and show zoom controls
        setTimeout(() => {
          isTransitioningRef.current = false;
          setShowZoomControls(true);
          // setSceneTransitioning(false); // DISABLED
        }, 150);
      } catch (err) {
        console.error("Error loading canvas state:", err);
        isTransitioningRef.current = false;
        setShowZoomControls(true);
        // setSceneTransitioning(false); // DISABLED
      }
    };

    loadCanvasState();
  }, [scene?.id]);

  // Load Player Characters from database
  useEffect(() => {
    if (!campaign?.id || mode !== "edit") return;

    const loadCharacters = async () => {
      try {
        const { data, error } = await supabase
          .from("characters")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("name");

        if (error) throw error;

        setCharacters(data || []);
        console.log(`Loaded ${data?.length || 0} characters for token library`);
      } catch (err) {
        console.error("Error loading characters:", err);
      }
    };

    loadCharacters();
  }, [campaign?.id, mode]);

  // Load NPCs from database
  useEffect(() => {
    if (!campaign?.id || mode !== "edit") return;

    const loadNPCs = async () => {
      try {
        const { data, error } = await supabase
          .from("npcs")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("name");

        if (error) throw error;

        setNpcs(data || []);
        console.log(`Loaded ${data?.length || 0} NPCs for token library`);
      } catch (err) {
        console.error("Error loading NPCs:", err);
      }
    };

    loadNPCs();
  }, [campaign?.id, mode]);

  // Auto-save canvas state (debounced)
  const saveCanvasState = async () => {
    if (!scene?.id || mode !== "edit") return;

    const canvasState = {
      layers,
      gridSettings,
      pageSettings,
      version: 1,
      lastUpdate: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("scenes")
        .update({
          canvas_state: canvasState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scene.id);

      if (error) throw error;

      console.log("Canvas state auto-saved");

      // Broadcast update to TV/players
      if (tvChannel) {
        await tvChannel.send({
          type: "broadcast",
          event: "canvas_update",
          payload: {
            sceneId: scene.id,
            canvasState,
          },
        });
        console.log("📡 Canvas update broadcasted");
      }
    } catch (err) {
      console.error("Error saving canvas state:", err);
    }
  };

  // Expose save function to parent component via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await saveCanvasState();
      console.log("✅ Canvas manually saved by DM");
    }
  }));

  // Manual save only - no auto-save
  // Removed auto-save to give DM full control over when to save changes
  const handleSaveCanvas = async () => {
    await saveCanvasState();
    console.log("✅ Canvas manually saved by DM");
    if (onSave) onSave(); // Notify parent component
  };

  // Listen for canvas updates from other DMs (in case of multiple DMs) - EDIT mode
  useEffect(() => {
    if (!tvChannel || mode !== "edit") return;

    const subscription = tvChannel
      .on("broadcast", { event: "canvas_update" }, ({ payload }) => {
        if (payload.sceneId === scene?.id) {
          console.log("📡 Received canvas update from another DM");

          // Only update if we're not the one who sent it
          // (avoid infinite loops)
          const state = payload.canvasState;
          if (state.layers) setLayers(state.layers);
          if (state.gridSettings) setGridSettings(state.gridSettings);
          if (state.pageSettings) setPageSettings(state.pageSettings);
        }
      })
      .on("broadcast", { event: "player_token_move" }, ({ payload }) => {
        console.log("📡 DM received player token move:", payload);

        // Update token position in PC layer
        setLayers(prev => ({
          ...prev,
          pc: {
            ...prev.pc,
            objects: prev.pc.objects.map(obj =>
              obj.id === payload.tokenId || obj.characterId === payload.characterId
                ? { ...obj, x: payload.gridCol * (gridSettings?.size || 50), y: payload.gridRow * (gridSettings?.size || 50) }
                : obj
            )
          }
        }));
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [tvChannel, scene?.id, mode, gridSettings]);

  // Apply canvas state from scene prop when in VIEW mode (TV/Players)
  useEffect(() => {
    if (mode !== "view" || !scene?.canvas_state) return;

    const state = scene.canvas_state;
    if (state.layers) setLayers(state.layers);
    if (state.gridSettings) setGridSettings(state.gridSettings);
    if (state.pageSettings) setPageSettings(state.pageSettings);

    console.log("📺 TV: Canvas state applied from scene prop");
  }, [scene?.canvas_state, mode]);

  // Listen for player token movements in VIEW mode (TV)
  useEffect(() => {
    if (!tvChannel || mode !== "view") return;

    const subscription = tvChannel
      .on("broadcast", { event: "player_token_move" }, ({ payload }) => {
        console.log("📺 TV received player token move:", payload);

        // Update token position in PC layer
        setLayers(prev => ({
          ...prev,
          pc: {
            ...prev.pc,
            objects: prev.pc.objects.map(obj =>
              obj.id === payload.tokenId || obj.characterId === payload.characterId
                ? { ...obj, x: payload.gridCol * (gridSettings?.size || 50), y: payload.gridRow * (gridSettings?.size || 50) }
                : obj
            )
          }
        }));
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [tvChannel, mode, gridSettings]);

  // Save to history (for undo/redo)
  const saveToHistory = () => {
    if (mode !== "edit") return;

    const state = { layers, gridSettings, pageSettings };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);

    // Limit history to 50 states
    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const undo = () => {
    if (historyIndex <= 0) return;

    const prevState = history[historyIndex - 1];
    setLayers(prevState.layers);
    setGridSettings(prevState.gridSettings);
    setPageSettings(prevState.pageSettings);
    setHistoryIndex(historyIndex - 1);
  };

  // Redo
  const redo = () => {
    if (historyIndex >= history.length - 1) return;

    const nextState = history[historyIndex + 1];
    setLayers(nextState.layers);
    setGridSettings(nextState.gridSettings);
    setPageSettings(nextState.pageSettings);
    setHistoryIndex(historyIndex + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (mode !== "edit") return;

    const handleKeyDown = (e) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && selectedLayer) {
        e.preventDefault();
        deleteObject(selectedLayer, selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, historyIndex, history, selectedId, selectedLayer]);

  // Update Transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedId]);

  // Force update Transformer after zoom/pan
  const updateTransformer = () => {
    if (transformerRef.current) {
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer().batchDraw();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedId && selectedLayer) {
        deleteObject(selectedLayer, selectedId);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedLayer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedLayer]);

  // Measure container and update viewport size
  useEffect(() => {
    let resizeTimeout;

    const updateSize = () => {
      // Debounce per evitare troppi re-render
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (stageContainerRef.current) {
          const rect = stageContainerRef.current.getBoundingClientRect();
          const newWidth = Math.floor(rect.width);
          const newHeight = Math.floor(rect.height);

          setViewportSize((prev) => {
            // Aggiorna solo se le dimensioni sono cambiate significativamente
            if (Math.abs(prev.width - newWidth) > 2 || Math.abs(prev.height - newHeight) > 2) {
              // Fit canvas to viewport on first load and when scene changes
              const allowAutoFit = !initialFitDoneRef.current[mode] && newWidth > 100 && newHeight > 100;

              if (allowAutoFit) {
                // Mark that auto-fit is done for this mode
                initialFitDoneRef.current[mode] = true;

                const scaleX = newWidth / canvasSize.width;
                const scaleY = newHeight / canvasSize.height;
                const fitScale = Math.min(scaleX, scaleY) * 0.95; // 95% to add some padding

                setStageScale(fitScale);
                // Center the canvas
                setStagePos({
                  x: (newWidth - canvasSize.width * fitScale) / 2,
                  y: (newHeight - canvasSize.height * fitScale) / 2,
                });
              }

              return { width: newWidth, height: newHeight };
            }
            return prev;
          });
        }
      }, 50);
    };

    // Initial measurement (con delay per permettere al DOM di renderizzare)
    setTimeout(updateSize, 100);

    // Update on window resize
    window.addEventListener("resize", updateSize);

    // Use ResizeObserver for precise container size tracking
    const resizeObserver = new ResizeObserver(updateSize);
    if (stageContainerRef.current) {
      resizeObserver.observe(stageContainerRef.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, [mode, canvasSize.width, canvasSize.height]);

  // Start upload process - show layer selection
  const startUpload = (file, clientX, clientY) => {
    if (!file || !file.type.startsWith("image/")) {
      setModal({
        isOpen: true,
        title: "File non valido",
        message: "Per favore seleziona un file immagine (PNG, JPG, etc.)",
        type: "error",
      });
      return;
    }
    setPendingUpload({ file, clientX, clientY });
  };

  // Upload file to selected layer
  const uploadFileToLayer = async (targetLayer) => {
    if (!pendingUpload) return;

    const { file, clientX, clientY } = pendingUpload;
    setPendingUpload(null);
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `scene_${scene.id}_${Date.now()}.${fileExt}`;
      const filePath = `canvas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("maps")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("maps")
        .getPublicUrl(filePath);

      // Calculate canvas position
      let x = canvasSize.width / 2 - 150;
      let y = canvasSize.height / 2 - 150;

      // If coordinates provided (from drag & drop), use them
      if (clientX && clientY && stageContainerRef.current) {
        const stageBox = stageContainerRef.current.getBoundingClientRect();
        x = (clientX - stageBox.left - stagePos.x) / stageScale;
        y = (clientY - stageBox.top - stagePos.y) / stageScale;
      }

      const newObject = {
        id: `obj_${Date.now()}`,
        type: "image",
        url: data.publicUrl,
        x: x,
        y: y,
        width: 300,
        height: 300,
        rotation: 0,
      };

      setLayers((prev) => ({
        ...prev,
        [targetLayer]: {
          ...prev[targetLayer],
          objects: [...prev[targetLayer].objects, newObject],
        },
      }));

      console.log(`Image added to ${targetLayer} layer at (${Math.round(x)}, ${Math.round(y)})`);
      setUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      setModal({
        isOpen: true,
        title: "Errore Upload",
        message: `Impossibile caricare l'immagine: ${error.message}`,
        type: "error",
      });
      setUploading(false);
    }
  };

  // Drag & Drop dal Desktop
  const handleFileDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    startUpload(file, e.clientX, e.clientY);
  };

  // File Input Handler
  const handleFileInput = async (e) => {
    const file = e.target.files[0];
    if (file) {
      startUpload(file, null, null);
      e.target.value = ""; // Reset input
    }
  };

  // Delete Object
  const deleteObject = (layerName, objectId) => {
    setLayers((prev) => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        objects: prev[layerName].objects.filter((o) => o.id !== objectId),
      },
    }));
    setSelectedId(null);
    setSelectedLayer(null);
    setContextMenu(null);

    // Save to history for undo/redo
    saveToHistory();
  };

  // Update Object
  const updateObject = (layerName, objectId, updates) => {
    setLayers((prev) => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        objects: prev[layerName].objects.map((o) =>
          o.id === objectId ? { ...o, ...updates } : o
        ),
      },
    }));

    saveToHistory();

    // If this object is the main map, update pageSettings too
    if (pageSettings.mapImage && layerName === "map") {
      const obj = layers[layerName].objects.find(o => o.id === objectId);
      if (obj && obj.url === pageSettings.mapImage.url) {
        setPageSettings(prev => ({
          ...prev,
          mapImage: {
            ...prev.mapImage,
            ...updates
          }
        }));
      }
    }
  };

  // Add NPC as Token
  const addNPCAsToken = (npc) => {
    if (!npc.avatar_url) {
      setModal({
        isOpen: true,
        title: "Avatar Mancante",
        message: `L'NPC "${npc.name}" non ha un'immagine avatar. Aggiungila nella sezione NPC prima di usarlo come token.`,
        type: "error",
      });
      return;
    }

    const newToken = {
      id: `token_${Date.now()}`,
      type: "image",
      url: npc.avatar_url,
      x: canvasSize.width / 2 - 75, // Centro mappa
      y: canvasSize.height / 2 - 75,
      width: 150, // Dimensione standard token
      height: 150,
      rotation: 0,
      // NPC data for reference
      npcId: npc.id,
      npcName: npc.name,
      hp: {
        current: npc.hp_current || npc.hp_max,
        max: npc.hp_max,
      },
      ac: npc.armor_class,
    };

    setLayers((prev) => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        objects: [...prev.tokens.objects, newToken],
      },
    }));

    console.log(`Added NPC "${npc.name}" as token on map`);
  };

  // Add Character as Token
  const addCharacterAsToken = async (character, config = {}) => {
    if (!character.avatar_url) {
      setModal({
        isOpen: true,
        title: "Avatar Mancante",
        message: `Il personaggio "${character.name}" non ha un'immagine avatar.`,
        type: "error",
      });
      return;
    }

    // Determine size based on config - matching grid size (200px)
    const sizeMap = {
      small: 100,   // 0.5 cells (Tiny/Small creatures)
      medium: 200,  // 1 cell (Medium creatures - standard)
      large: 400,   // 2x2 cells (Large creatures)
    };
    const tokenSize = sizeMap[config.size || "medium"];

    const newToken = {
      id: `token_${Date.now()}`,
      type: "image",
      url: character.avatar_url,
      x: canvasSize.width / 2 - tokenSize / 2, // Centro mappa
      y: canvasSize.height / 2 - tokenSize / 2,
      width: tokenSize,
      height: tokenSize,
      rotation: 0,
      // Character data for reference
      characterId: character.id,
      characterName: character.name,
      hp: {
        current: character.hp_current || character.hp_max,
        max: character.hp_max,
      },
      ac: character.armor_class,
      // Token editor configuration
      tokenConfig: {
        showHPBar: config.showHPBar !== undefined ? config.showHPBar : true,
        showName: config.showName !== undefined ? config.showName : true,
        showACBadge: config.showACBadge !== undefined ? config.showACBadge : true,
        borderStyle: config.borderStyle || "solid",
        tokenColor: character.token_color || "#4070c0",
      },
    };

    setLayers((prev) => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        objects: [...prev.tokens.objects, newToken],
      },
    }));

    // Update character with map coordinates (center of map as percentage)
    const mapCenterX = 50; // 50% = centro
    const mapCenterY = 50;

    try {
      await supabase
        .from("characters")
        .update({ map_x: mapCenterX, map_y: mapCenterY })
        .eq("id", character.id);

      console.log(`Added character "${character.name}" as token on map at (${mapCenterX}%, ${mapCenterY}%)`);
    } catch (err) {
      console.error("Error updating character coordinates:", err);
    }
  };

  // Grid Lines - Memoized to avoid regenerating on every render (PERFORMANCE!)
  const gridLines = React.useMemo(() => {
    if (!gridSettings.enabled) {
      return [];
    }
    console.log("Generating grid lines, size:", gridSettings.size);
    const lines = [];
    const { size, offsetX, offsetY } = gridSettings;

    // If there's a main map, grid covers only the map area
    // Otherwise, grid covers entire canvas
    let gridMinX = 0;
    let gridMinY = 0;
    let gridMaxX = canvasSize.width;
    let gridMaxY = canvasSize.height;

    if (pageSettings.mapImage) {
      gridMinX = pageSettings.mapImage.x || 0;
      gridMinY = pageSettings.mapImage.y || 0;
      gridMaxX = gridMinX + (pageSettings.mapImage.width || canvasSize.width);
      gridMaxY = gridMinY + (pageSettings.mapImage.height || canvasSize.height);
      console.log(`Grid limited to map area: (${gridMinX}, ${gridMinY}) to (${gridMaxX}, ${gridMaxY})`);
    }

    // Vertical lines
    for (let x = offsetX; x <= gridMaxX; x += size) {
      if (x >= gridMinX) {
        lines.push(
          <Line
            key={`v-${x}`}
            points={[x, gridMinY, x, gridMaxY]}
            stroke={gridSettings.color}
            strokeWidth={2}
            opacity={gridSettings.opacity}
          />
        );
      }
    }

    // Horizontal lines
    for (let y = offsetY; y <= gridMaxY; y += size) {
      if (y >= gridMinY) {
        lines.push(
          <Line
            key={`h-${y}`}
            points={[gridMinX, y, gridMaxX, y]}
            stroke={gridSettings.color}
            strokeWidth={2}
            opacity={gridSettings.opacity}
          />
        );
      }
    }

    return lines;
  }, [gridSettings, pageSettings.mapImage, canvasSize]);

  // Handle Wheel Zoom
  const handleWheel = (e) => {
    if (tool !== "pan") return;

    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });

    // Aggiorna transformer dopo zoom
    setTimeout(updateTransformer, 0);
  };

  // Character Token Component (circular with border)
  const CharacterToken = React.memo(({ obj }) => {
    const [image] = useImage(obj.url);
    const config = obj.tokenConfig || {};
    const borderStyle = config.borderStyle || "solid";
    const tokenColor = config.tokenColor || "#4070c0";
    const showHPBar = config.showHPBar !== false;
    const showName = config.showName !== false;
    const showACBadge = config.showACBadge !== false;

    const size = obj.width || 50;
    const radius = size / 2;

    // Memoize clip function to avoid re-creating it on every render
    // MUST be before conditional return to follow Rules of Hooks!
    const clipFunc = React.useCallback((ctx) => {
      ctx.arc(radius, radius, radius, 0, Math.PI * 2, false);
    }, [radius]);

    if (!image) return null;

    return (
      <Group
        x={obj.x}
        y={obj.y}
        draggable={tool === "select" && !layers.tokens.locked}
        onDragEnd={(e) => {
          lastHighlightCellRef.current = null;
          setDragHighlightCell(null);

          let newX = e.target.x();
          let newY = e.target.y();

          if (gridSettings.snapToGrid) {
            // Snap to grid cell center
            const tokenCenterX = newX + radius;
            const tokenCenterY = newY + radius;

            const gridX = Math.round((tokenCenterX - gridSettings.offsetX) / gridSettings.size);
            const gridY = Math.round((tokenCenterY - gridSettings.offsetY) / gridSettings.size);

            const cellCenterX = gridX * gridSettings.size + gridSettings.offsetX + (gridSettings.size / 2);
            const cellCenterY = gridY * gridSettings.size + gridSettings.offsetY + (gridSettings.size / 2);

            newX = cellCenterX - radius;
            newY = cellCenterY - radius;

            e.target.x(newX);
            e.target.y(newY);
          }

          updateObject("tokens", obj.id, { x: newX, y: newY });
        }}
        onClick={(e) => {
          if (tool === "select") {
            setSelectedId(obj.id);
            setSelectedLayer("tokens");
          } else if (tool === "erase") {
            deleteObject("tokens", obj.id);
          }
        }}
        onTap={(e) => {
          if (tool === "select") {
            setSelectedId(obj.id);
            setSelectedLayer("tokens");
          } else if (tool === "erase") {
            deleteObject("tokens", obj.id);
          }
        }}
      >
        {/* Clipped circular token */}
        <Group clipFunc={clipFunc}>
          {/* Background circle */}
          <Circle
            x={radius}
            y={radius}
            radius={radius}
            fill="#000"
          />

          {/* Image clipped in circle */}
          <KonvaImage
            image={image}
            x={0}
            y={0}
            width={size}
            height={size}
          />

          {/* Circular border on top */}
          <Circle
            x={radius}
            y={radius}
            radius={radius - 2}
            stroke={tokenColor}
            strokeWidth={borderStyle === "double" ? 6 : 4}
            dash={borderStyle === "double" ? [10, 5] : undefined}
            shadowColor={borderStyle === "glow" ? tokenColor : undefined}
            shadowBlur={borderStyle === "glow" ? 20 : 0}
            shadowOpacity={borderStyle === "glow" ? 0.8 : 0}
            listening={false}
          />
        </Group>

        {/* HP Bar - relative coordinates */}
        {showHPBar && obj.hp && obj.hp.current !== undefined && obj.hp.max && (
          <>
            <Rect
              x={0}
              y={-15}
              width={size}
              height={8}
              fill="rgba(0,0,0,0.7)"
              cornerRadius={2}
            />
            <Rect
              x={0}
              y={-15}
              width={size * (obj.hp.current / obj.hp.max)}
              height={8}
              fill={obj.hp.current / obj.hp.max > 0.5 ? "#4ade80" : obj.hp.current / obj.hp.max > 0.25 ? "#fbbf24" : "#ef4444"}
              cornerRadius={2}
            />
            <KonvaText
              x={0}
              y={-14}
              width={size}
              text={`${obj.hp.current}/${obj.hp.max}`}
              fontSize={9}
              fill="#fff"
              align="center"
              fontStyle="bold"
            />
          </>
        )}

        {/* AC Badge - relative coordinates */}
        {showACBadge && obj.ac && (
          <>
            <Circle
              x={size - 12}
              y={12}
              radius={16}
              fill="#6366f1"
              stroke="#fff"
              strokeWidth={2}
              shadowColor="rgba(0,0,0,0.4)"
              shadowBlur={4}
              shadowOffset={{ x: 0, y: 2 }}
            />
            <KonvaText
              x={size - 12 - 16}
              y={12 - 16}
              width={32}
              height={32}
              text={String(obj.ac)}
              fontSize={12}
              fill="#fff"
              align="center"
              verticalAlign="middle"
              fontStyle="bold"
            />
          </>
        )}

        {/* Character Name - relative coordinates */}
        {showName && obj.characterName && (
          <KonvaText
            x={0}
            y={size + 5}
            width={size}
            text={obj.characterName}
            fontSize={12}
            fill={tokenColor}
            align="center"
            fontStyle="bold"
            shadowColor="rgba(0,0,0,0.8)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
          />
        )}
      </Group>
    );
  });

  // Konva Image Component
  const KonvaImageObject = React.memo(({ obj, layerName }) => {
    const [image] = useImage(obj.url);
    const shapeRef = useRef();
    const trRef = useRef();
    const renderCount = useRef(0);
    renderCount.current++;
    if (renderCount.current % 10 === 0) {
      console.log(`[${obj.id}] Re-rendered ${renderCount.current} times`);
    }

    const isSelected = selectedId === obj.id && selectedLayer === layerName;

    // Attach transformer when selected
    useEffect(() => {
      if (isSelected && trRef.current && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
      }
    }, [isSelected]);

    const isDraggable = tool === "select" && !layers[layerName].locked && layerName === currentLayer;

    return (
      <>
        <KonvaImage
          ref={shapeRef}
        id={obj.id}
        image={image}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        rotation={obj.rotation || 0}
        draggable={isDraggable}
        perfectDrawEnabled={false}
        onClick={(e) => {
          if (tool === "select") {
            setSelectedId(obj.id);
            setSelectedLayer(layerName);
          } else if (tool === "erase") {
            deleteObject(layerName, obj.id);
          }
        }}
        onTap={(e) => {
          if (tool === "select") {
            setSelectedId(obj.id);
            setSelectedLayer(layerName);
          }
        }}
        onDragEnd={(e) => {
          const newX = gridSettings.snapToGrid
            ? snapToGrid(e.target.x(), gridSettings.size, gridSettings.offsetX)
            : e.target.x();
          const newY = gridSettings.snapToGrid
            ? snapToGrid(e.target.y(), gridSettings.size, gridSettings.offsetY)
            : e.target.y();

          updateObject(layerName, obj.id, {
            x: newX,
            y: newY,
          });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          updateObject(layerName, obj.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const stage = e.target.getStage();
          const pointerPos = stage.getPointerPosition();
          setContextMenu({
            x: pointerPos.x,
            y: pointerPos.y,
            objectId: obj.id,
            layerName: layerName,
          });
          setSelectedId(obj.id);
          setSelectedLayer(layerName);
        }}
      />
        {isSelected && mode === "edit" && (
          <Transformer
            ref={trRef}
            keepRatio={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            rotateEnabled={true}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </>
    );
  });

  // Collapsible Section
  const CollapsibleSection = ({ id, title, icon, children }) => {
    const isOpen = !collapsedSections[id];

    return (
      <div style={{ borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
        <motion.div
          onClick={() => toggleSection(id)}
          whileHover={{ background: "rgba(212,175,55,0.08)" }}
          style={{
            padding: "16px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1rem" }}>{icon}</span>
            <div style={{
              color: "var(--gold)",
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              {title}
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: "rgba(212,175,55,0.7)", fontSize: "0.9rem" }}
          >
            ▼
          </motion.div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <div style={{ padding: "0 20px 20px" }}>
            {children}
          </div>
        </motion.div>
      </div>
    );
  };

  // VIEW MODE - Show only the canvas (for TV/Players)
  if (mode === "view") {
    return (
      <div
        ref={stageContainerRef}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: pageSettings.backgroundColor,
          cursor: viewMeasure ? "crosshair" : "default",
          touchAction: "none", // Disable touch gestures
        }}
      >
        <Stage
          ref={stageRef}
          width={viewportSize.width}
          height={viewportSize.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={false}
          onWheel={undefined}
          onDragEnd={undefined}
          onMouseDown={(e) => {
            const stage = e.target.getStage();
            const pos = stage.getPointerPosition();
            const canvasPos = {
              x: (pos.x - stagePos.x) / stageScale,
              y: (pos.y - stagePos.y) / stageScale,
            };
            // Right-click: inizia misura
            if (e.evt.button === 2) {
              e.evt.preventDefault();
              setViewMeasure({ startX: canvasPos.x, startY: canvasPos.y, endX: canvasPos.x, endY: canvasPos.y });
            }
            // Left-click: cancella misura
            if (e.evt.button === 0 && viewMeasure) {
              setViewMeasure(null);
            }
          }}
          onMouseMove={(e) => {
            const stage = e.target.getStage();
            const pos = stage.getPointerPosition();
            const canvasPos = {
              x: (pos.x - stagePos.x) / stageScale,
              y: (pos.y - stagePos.y) / stageScale,
            };
            const gSize = gridSettings?.size || 40;

            // Cursor grid position disabled to prevent flickering
            // If you need it, uncomment and increase throttle value (e.g., 500ms)
            // const now = Date.now();
            // if (now - lastCursorUpdate.current > 500) {
            //   lastCursorUpdate.current = now;
            //   setCursorGridPos({
            //     col: Math.floor((canvasPos.x - (gridSettings?.offsetX || 0)) / gSize) + 1,
            //     row: Math.floor((canvasPos.y - (gridSettings?.offsetY || 0)) / gSize) + 1,
            //   });
            // }

            if (viewMeasure) {
              setViewMeasure(prev => prev ? { ...prev, endX: canvasPos.x, endY: canvasPos.y } : null);
            }
          }}
        >
          {/* Background */}
          <Layer>
            <Rect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill={pageSettings.backgroundColor}
            />
          </Layer>

          {/* MAP Layer */}
          <Layer name="map-layer" listening={currentLayer === "map"}>
            {layers.map.visible && layers.map.objects.map((obj) => (
              <KonvaImageObject key={obj.id} obj={obj} layerName="map" />
            ))}
          </Layer>

          {/* Grid Layer - MUST be above MAP to be visible */}
          {gridSettings.enabled && (
            <Layer listening={false}>
              {gridLines}

            </Layer>
          )}

          {/* OBJECTS Layer */}
          <Layer name="objects-layer" listening={currentLayer === "objects"}>
            {layers.objects.visible && layers.objects.objects.map((obj) => {
              // Render drawings (view mode - no interaction)
              if (obj.type === "freehand") {
                return (
                  <Line
                    key={obj.id}
                    points={obj.points}
                    stroke={obj.color}
                    strokeWidth={obj.width}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }
              if (obj.type === "line") {
                return (
                  <Line
                    key={obj.id}
                    points={[obj.start.x, obj.start.y, obj.end.x, obj.end.y]}
                    stroke={obj.color}
                    strokeWidth={obj.width}
                    lineCap="round"
                  />
                );
              }
              if (obj.type === "rectangle") {
                const x = Math.min(obj.start.x, obj.end.x);
                const y = Math.min(obj.start.y, obj.end.y);
                const width = Math.abs(obj.end.x - obj.start.x);
                const height = Math.abs(obj.end.y - obj.start.y);
                return (
                  <Rect
                    key={obj.id}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    stroke={obj.color}
                    strokeWidth={obj.width}
                  />
                );
              }
              if (obj.type === "circle") {
                const radius = Math.sqrt(
                  Math.pow(obj.end.x - obj.start.x, 2) + Math.pow(obj.end.y - obj.start.y, 2)
                );
                return (
                  <Circle
                    key={obj.id}
                    x={obj.start.x}
                    y={obj.start.y}
                    radius={radius}
                    stroke={obj.color}
                    strokeWidth={obj.width}
                  />
                );
              }
              if (obj.type === "text") {
                return (
                  <KonvaText
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontSize={obj.fontSize || 24}
                    fill={obj.color}
                    fontStyle="bold"
                    shadowColor="rgba(0,0,0,0.8)"
                    shadowBlur={4}
                    shadowOffset={{ x: 2, y: 2 }}
                  />
                );
              }
              // Render images
              return <KonvaImageObject key={obj.id} obj={obj} layerName="objects" />;
            })}
          </Layer>

          {/* TOKENS Layer */}
          <Layer name="tokens-layer" listening={currentLayer === "tokens"}>
            {/* Drag highlight cell - shown BEFORE tokens so tokens render on top */}
            {dragHighlightCell && (
              <Rect
                x={dragHighlightCell.gridX * gridSettings.size + gridSettings.offsetX}
                y={dragHighlightCell.gridY * gridSettings.size + gridSettings.offsetY}
                width={gridSettings.size}
                height={gridSettings.size}
                fill="rgba(255, 215, 0, 0.4)"
                stroke="#FFD700"
                strokeWidth={4}
                listening={false}
              />
            )}

            {layers.tokens.visible && layers.tokens.objects.map((obj) => {
              // Only extract config for character tokens
              if (!obj.characterId) {
                // Regular token (taverna, bosco, etc.)
                return <KonvaImageObject key={obj.id} obj={obj} layerName="tokens" />;
              }

              // Character token - extract config
              const config = obj.tokenConfig || {};
              const showHPBar = config.showHPBar !== false;
              const showName = config.showName !== false;
              const showACBadge = config.showACBadge !== false;

              return <CharacterToken key={obj.id} obj={obj} />;
            })}
          </Layer>

          {/* Fog of War Layer - Mostra solo le aree NASCOSTE */}
          {pageSettings.fogOfWar.enabled && (
            <Layer listening={false}>
              {/* Aree nascoste - Opache per i giocatori */}
              {(pageSettings.fogOfWar.hiddenAreas || []).map((area, idx) => {
                if (area.type === "circle") {
                  return (
                    <Circle key={`h-${idx}`}
                      x={area.cx} y={area.cy} radius={area.radius}
                      fill="#000000" opacity={0.98}
                    />
                  );
                }
                if (area.type === "polygon" && area.points?.length >= 4) {
                  return (
                    <Line key={`h-${idx}`}
                      points={area.points} closed
                      fill="#000000" opacity={0.98}
                    />
                  );
                }
                return (
                  <Rect key={`h-${idx}`}
                    x={area.x} y={area.y}
                    width={area.width} height={area.height}
                    fill="#000000" opacity={0.98}
                  />
                );
              })}
              {/* Preview del fog reveal in corso (rettangolo tratteggiato) */}
              {fogRevealStart && fogMode === "rect" && (
                <Rect
                  x={fogRevealStart.width < 0 ? fogRevealStart.x + fogRevealStart.width : fogRevealStart.x}
                  y={fogRevealStart.height < 0 ? fogRevealStart.y + fogRevealStart.height : fogRevealStart.y}
                  width={Math.abs(fogRevealStart.width || 0)}
                  height={Math.abs(fogRevealStart.height || 0)}
                  stroke="rgba(76,175,80,0.8)" strokeWidth={2 / stageScale}
                  dash={[8 / stageScale, 4 / stageScale]}
                  fill="rgba(76,175,80,0.15)"
                />
              )}
              {/* Preview polygon in costruzione */}
              {fogPolygonPoints.length >= 2 && fogMode === "polygon" && (
                <Line
                  points={fogPolygonPoints}
                  stroke="rgba(76,175,80,0.8)" strokeWidth={2 / stageScale}
                  dash={[8 / stageScale, 4 / stageScale]}
                  fill="rgba(76,175,80,0.1)" closed={fogPolygonPoints.length >= 6}
                />
              )}
            </Layer>
          )}

          {/* Ping for players */}
          {pingPosition && (
            <Layer listening={false}>
              <Circle
                x={pingPosition.x}
                y={pingPosition.y}
                radius={30}
                stroke="#ff6b6b"
                strokeWidth={4}
                opacity={0.8}
              />
              <Circle
                x={pingPosition.x}
                y={pingPosition.y}
                radius={15}
                fill="#ff6b6b"
                opacity={0.6}
              />
            </Layer>
          )}

          {/* View mode: Linea misura distanza (right-click drag) */}
          {viewMeasure && (
            <Layer listening={false}>
              {/* Linea principale */}
              <Line
                points={[viewMeasure.startX, viewMeasure.startY, viewMeasure.endX, viewMeasure.endY]}
                stroke="#ffd700"
                strokeWidth={3 / stageScale}
                dash={[10 / stageScale, 5 / stageScale]}
                opacity={0.9}
              />
              {/* Cerchietto start */}
              <Circle x={viewMeasure.startX} y={viewMeasure.startY}
                radius={6 / stageScale} fill="#ffd700" opacity={0.8} />
              {/* Cerchietto end */}
              <Circle x={viewMeasure.endX} y={viewMeasure.endY}
                radius={6 / stageScale} fill="#ffd700" opacity={0.8} />
              {/* Label distanza */}
              {(() => {
                const dx = viewMeasure.endX - viewMeasure.startX;
                const dy = viewMeasure.endY - viewMeasure.startY;
                const distPx = Math.sqrt(dx * dx + dy * dy);
                const gSize = gridSettings?.size || 40;
                const squares = distPx / gSize;
                const feet = squares * 5;
                const midX = (viewMeasure.startX + viewMeasure.endX) / 2;
                const midY = (viewMeasure.startY + viewMeasure.endY) / 2;
                return (
                  <Group x={midX} y={midY - 20 / stageScale}>
                    <Rect
                      x={-45 / stageScale} y={-12 / stageScale}
                      width={90 / stageScale} height={24 / stageScale}
                      fill="rgba(0,0,0,0.85)" cornerRadius={4 / stageScale}
                    />
                    <KonvaText
                      text={`${feet.toFixed(0)} ft (${squares.toFixed(1)}□)`}
                      x={-42 / stageScale} y={-8 / stageScale}
                      fontSize={11 / stageScale}
                      fill="#ffd700" fontStyle="bold"
                    />
                  </Group>
                );
              })()}
            </Layer>
          )}
        </Stage>

        {/* Coordinate display — bottom left */}
        {cursorGridPos && (
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            background: "rgba(10,8,6,0.9)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 6, padding: "4px 10px",
            fontSize: "0.6rem", color: "rgba(212,175,55,0.7)",
            fontFamily: "monospace", fontWeight: 600,
            zIndex: 50,
          }}>
            Col {cursorGridPos.col}, Riga {cursorGridPos.row}
          </div>
        )}

        {/* Misura distanza info */}
        {viewMeasure && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,8,6,0.9)",
            border: "1px solid rgba(255,215,0,0.4)",
            borderRadius: 8, padding: "6px 16px",
            fontSize: "0.7rem", color: "#ffd700",
            fontWeight: 600, zIndex: 50,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span>Tasto destro per misurare</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
            <button onClick={() => setViewMeasure(null)}
              style={{
                background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)",
                borderRadius: 4, padding: "2px 8px", color: "#ffd700",
                cursor: "pointer", fontSize: "0.6rem",
              }}>
              Cancella misura
            </button>
          </div>
        )}

        {/* ═══ VIEW MODE: ZOOM & PAN CONTROLS ═══ */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          display: "flex", gap: 10,
          zIndex: 50, alignItems: "flex-start",
        }}>
          {/* Pan Controls (Frecce direzionali) */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            background: "rgba(10,8,6,0.9)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 8, padding: "6px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}>
            {/* Up */}
            <button onClick={() => setStagePos(prev => ({ ...prev, y: prev.y - 100 }))}
              style={{
                width: 26, height: 26, borderRadius: 5,
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                color: "var(--gold)", cursor: "pointer", fontSize: "0.7rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>▲</button>

            {/* Left, Center, Right */}
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setStagePos(prev => ({ ...prev, x: prev.x - 100 }))}
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                  color: "var(--gold)", cursor: "pointer", fontSize: "0.7rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>◄</button>

              <button onClick={() => setStagePos({ x: 0, y: 0 })}
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                  color: "rgba(212,175,55,0.6)", cursor: "pointer", fontSize: "0.6rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>⌂</button>

              <button onClick={() => setStagePos(prev => ({ ...prev, x: prev.x + 100 }))}
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                  color: "var(--gold)", cursor: "pointer", fontSize: "0.7rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>►</button>
            </div>

            {/* Down */}
            <button onClick={() => setStagePos(prev => ({ ...prev, y: prev.y + 100 }))}
              style={{
                width: 26, height: 26, borderRadius: 5,
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                color: "var(--gold)", cursor: "pointer", fontSize: "0.7rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>▼</button>
          </div>

          {/* Zoom Controls */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            background: "rgba(10,8,6,0.9)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 8, padding: "6px 5px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}>
            <button onClick={() => setStageScale(Math.min(stageScale * 1.2, 5))}
              style={{
                width: 26, height: 26, borderRadius: 5,
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                color: "var(--gold)", cursor: "pointer", fontSize: "0.9rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</button>

            <div style={{ fontSize: "0.5rem", color: "var(--gold)", fontWeight: 600 }}>
              {(stageScale * 100).toFixed(0)}%
            </div>

            <button onClick={() => setStageScale(Math.max(stageScale / 1.2, 0.1))}
              style={{
                width: 26, height: 26, borderRadius: 5,
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                color: "var(--gold)", cursor: "pointer", fontSize: "0.9rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>-</button>

            <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
              style={{
                width: 26, height: 18, borderRadius: 3,
                background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                color: "rgba(212,175,55,0.6)", cursor: "pointer",
                fontSize: "0.45rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>FIT</button>
          </div>
        </div>
      </div>
    );
  }

  // EDIT MODE - Full interface for DM
  return (
    <div style={{
      display: "flex",
      height: "100%",
      width: "100%",
      gap: 0,
      background: "#000",
      overflow: "hidden",
    }}>
      {/* CANVAS AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* TOOLBAR - Only in edit mode */}
        {mode === "edit" && (
        <div style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 100%)",
          borderBottom: "2px solid rgba(212,175,55,0.3)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Tools */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Undo/Redo */}
              <div style={{
                display: "flex",
                gap: 4,
                padding: "4px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: 8,
                border: "1px solid rgba(212,175,55,0.2)",
              }}>
                <motion.button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  whileHover={historyIndex > 0 ? { scale: 1.05 } : {}}
                  whileTap={historyIndex > 0 ? { scale: 0.95 } : {}}
                  title="Undo (Ctrl+Z)"
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    color: historyIndex > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                    cursor: historyIndex > 0 ? "pointer" : "not-allowed",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                >
                  ↶ <span style={{ fontSize: "0.65rem" }}>Undo</span>
                </motion.button>
                <motion.button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  whileHover={historyIndex < history.length - 1 ? { scale: 1.05 } : {}}
                  whileTap={historyIndex < history.length - 1 ? { scale: 0.95 } : {}}
                  title="Redo (Ctrl+Shift+Z)"
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    color: historyIndex < history.length - 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                    cursor: historyIndex < history.length - 1 ? "pointer" : "not-allowed",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                >
                  ↷ <span style={{ fontSize: "0.65rem" }}>Redo</span>
                </motion.button>
              </div>

              {/* Main Tools - Always visible */}
              <div style={{
                display: "flex",
                gap: 4,
                padding: "4px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: 8,
                border: "1px solid rgba(212,175,55,0.2)",
              }}>
                {[
                  { id: "select", icon: "⌖", label: "Select" },
                  { id: "pan", icon: "☰", label: "Pan" },
                ].map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => {
                      // Toggle: se "pan" è già attivo, torna a "select"
                      if (tool === t.id && t.id === "pan") {
                        setTool("select");
                      } else {
                        setTool(t.id);
                      }
                      setSelectedId(null);
                      setSelectedLayer(null);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={t.label}
                    style={{
                      padding: "8px 12px",
                      background: tool === t.id ? "rgba(212,175,55,0.25)" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      color: tool === t.id ? "var(--gold)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.icon}
                    <span style={{ fontSize: "0.7rem" }}>{t.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Drawing Tools - Dropdown */}
              <div style={{ position: "relative" }}>
                <motion.button
                  onClick={() => setShowDrawingMenu(!showDrawingMenu)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "8px 16px",
                    background: ["draw", "line", "rectangle", "circle", "text"].includes(tool)
                      ? "rgba(212,175,55,0.25)"
                      : "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 8,
                    color: ["draw", "line", "rectangle", "circle", "text"].includes(tool)
                      ? "var(--gold)"
                      : "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  ✎ Drawing ▾
                </motion.button>

                {/* Drawing Menu Dropdown */}
                <AnimatePresence>
                  {showDrawingMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: 4,
                        background: "rgba(20,18,15,0.98)",
                        border: "2px solid rgba(212,175,55,0.4)",
                        borderRadius: 8,
                        padding: "6px",
                        minWidth: 160,
                        zIndex: 1000,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
                      }}
                    >
                      {[
                        { id: "draw", icon: "✎", label: "Freehand" },
                        { id: "line", icon: "╱", label: "Line" },
                        { id: "rectangle", icon: "▭", label: "Rectangle" },
                        { id: "circle", icon: "○", label: "Circle" },
                        { id: "text", icon: "T", label: "Text" },
                      ].map((t) => (
                        <motion.button
                          key={t.id}
                          onClick={() => {
                            // Toggle: se il tool è già attivo, torna a "select"
                            if (tool === t.id) {
                              setTool("select");
                            } else {
                              setTool(t.id);
                              setSelectedId(null);
                              setSelectedLayer(null);
                            }
                            setShowDrawingMenu(false);
                          }}
                          whileHover={{ background: "rgba(212,175,55,0.2)" }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: tool === t.id ? "rgba(212,175,55,0.25)" : "transparent",
                            border: "none",
                            borderRadius: 6,
                            color: tool === t.id ? "var(--gold)" : "rgba(255,255,255,0.7)",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
                          {t.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Other Tools */}
              <div style={{
                display: "flex",
                gap: 4,
                padding: "4px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: 8,
                border: "1px solid rgba(212,175,55,0.2)",
              }}>
                {[
                  { id: "ruler", icon: "⟷", label: "Ruler" },
                  { id: "ping", icon: "◉", label: "Ping" },
                  { id: "fog", icon: "≋", label: "Fog" },
                  { id: "erase", icon: "eraser", label: "Gomma" },
                ].map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => {
                      // Toggle: se il tool è già attivo, torna a "select"
                      if (tool === t.id) {
                        setTool("select");
                      } else {
                        setTool(t.id);
                        if (t.id !== "select") {
                          setSelectedId(null);
                          setSelectedLayer(null);
                        }
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={t.label}
                    style={{
                      padding: "8px 12px",
                      background: tool === t.id ? "rgba(212,175,55,0.25)" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      color: tool === t.id ? "var(--gold)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.icon === "eraser" ? <FaEraser /> : t.icon}
                    <span style={{ fontSize: "0.7rem" }}>{t.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ FOG OF WAR SUB-TOOLBAR ═══ */}
          {tool === "fog" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px",
              background: "rgba(0,0,0,0.6)",
              borderBottom: "1px solid rgba(76,175,80,0.2)",
            }}>
              {/* Fog mode buttons - Tutti nascondono aree */}
              {[
                { id: "rect", label: "Rettangolo", icon: "▭" },
                { id: "brush", label: "Pennello", icon: "●" },
                { id: "polygon", label: "Poligono", icon: "⬠" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setFogMode(m.id); setFogPolygonPoints([]); }}
                  title={m.label}
                  style={{
                    padding: "6px 12px",
                    background: fogMode === m.id ? "rgba(76,175,80,0.25)" : "transparent",
                    border: fogMode === m.id ? "1px solid rgba(76,175,80,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: fogMode === m.id ? "#4caf50" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{m.icon}</span> {m.label}
                </button>
              ))}

              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

              {/* Brush size */}
              {fogMode === "brush" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>Dimensione:</span>
                  <input
                    type="range" min="10" max="200" step="5"
                    value={fogBrushSize}
                    onChange={(e) => setFogBrushSize(Number(e.target.value))}
                    style={{ width: 80, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.65rem", color: "var(--gold)", fontWeight: 600, minWidth: 28 }}>{fogBrushSize}</span>
                </div>
              )}

              {/* Polygon confirm */}
              {fogMode === "polygon" && fogPolygonPoints.length >= 6 && (
                <button
                  onClick={() => {
                    if (fogPolygonPoints.length >= 6) {
                      hideFogArea({ type: "polygon", points: [...fogPolygonPoints] });
                      setFogPolygonPoints([]);
                    }
                  }}
                  style={{
                    padding: "6px 14px",
                    background: "rgba(76,175,80,0.25)",
                    border: "1px solid rgba(76,175,80,0.5)",
                    borderRadius: 6, color: "#4caf50",
                    cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                  }}
                >
                  Conferma Poligono
                </button>
              )}

              {fogMode === "polygon" && fogPolygonPoints.length > 0 && (
                <button
                  onClick={() => setFogPolygonPoints([])}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6, color: "rgba(255,255,255,0.4)",
                    cursor: "pointer", fontSize: "0.65rem",
                  }}
                >
                  Annulla
                </button>
              )}

              <div style={{ flex: 1 }} />

              {/* Fog On/Off */}
              <button
                onClick={toggleFogOfWar}
                style={{
                  padding: "6px 12px",
                  background: pageSettings.fogOfWar.enabled ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${pageSettings.fogOfWar.enabled ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 6,
                  color: pageSettings.fogOfWar.enabled ? "#4caf50" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "0.65rem", fontWeight: 600,
                }}
              >
                Fog {pageSettings.fogOfWar.enabled ? "ON" : "OFF"}
              </button>

              {/* Reveal all */}
              <button
                onClick={revealAllFog}
                title="Rimuovi tutta la fog (mappa visibile)"
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid rgba(76,175,80,0.3)",
                  borderRadius: 6, color: "#4caf50",
                  cursor: "pointer", fontSize: "0.65rem",
                }}
              >
                Rivela Tutto
              </button>

              {/* Hide all */}
              <button
                onClick={hideAllFog}
                title="Copri tutta la mappa"
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid rgba(255,107,107,0.3)",
                  borderRadius: 6, color: "#ff6b6b",
                  cursor: "pointer", fontSize: "0.65rem",
                }}
              >
                Nascondi Tutto
              </button>
            </div>
          )}

          {/* Info */}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {uploading && (
              <div style={{
                fontSize: "0.75rem",
                color: "var(--gold)",
                fontWeight: 600,
              }}>
                Uploading...
              </div>
            )}
            <div style={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Livello: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{currentLayer}</span>
            </div>
            <div style={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Zoom: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{(stageScale * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        )}

        {/* Konva Stage */}
        <div
          ref={stageContainerRef}
          style={{
            flex: 1,
            overflow: "hidden",
            background: "#0a0806",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
            if (contextMenu) setContextMenu(null);
          }}
        >
          <Stage
            ref={stageRef}
            width={viewportSize.width}
            height={viewportSize.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={mode !== "edit" || tool === "pan"}
            onWheel={handleWheel}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              const pos = stage.getPointerPosition();
              const canvasPos = {
                x: (pos.x - stagePos.x) / stageScale,
                y: (pos.y - stagePos.y) / stageScale,
              };

              // View mode: right-click misura distanza
              if (mode !== "edit") {
                if (e.evt.button === 2) {
                  e.evt.preventDefault();
                  setViewMeasure({ startX: canvasPos.x, startY: canvasPos.y, endX: canvasPos.x, endY: canvasPos.y });
                }
                return;
              }

              // === EDIT MODE ===
              const clickedOnEmpty = e.target === e.target.getStage();

              // Grid alignment mode
              if (gridAlignMode) {
                if (!alignStart) {
                  setAlignStart(canvasPos);
                } else {
                  setAlignEnd(canvasPos);
                }
                return;
              }

              // Drawing tool (freehand)
              if (tool === "draw") {
                setIsDrawing(true);
                setCurrentDrawing({
                  type: "freehand",
                  points: [canvasPos.x, canvasPos.y],
                  color: drawColor,
                  width: drawWidth,
                });
                return;
              }

              // Shape tools (rectangle, circle, line)
              if (["rectangle", "circle", "line"].includes(tool)) {
                setIsDrawing(true);
                const snappedPos = gridSettings.snapToGrid
                  ? {
                      x: snapToGrid(canvasPos.x, gridSettings.size, gridSettings.offsetX),
                      y: snapToGrid(canvasPos.y, gridSettings.size, gridSettings.offsetY),
                    }
                  : canvasPos;
                setCurrentDrawing({
                  type: tool,
                  start: snappedPos,
                  end: snappedPos,
                  color: drawColor,
                  width: drawWidth,
                });
                return;
              }

              // Ruler tool
              if (tool === "ruler") {
                if (!rulerStart) {
                  // First click - start ruler
                  setRulerStart(canvasPos);
                  setRulerEnd(canvasPos);
                } else if (!rulerEnd || (rulerEnd.x === rulerStart.x && rulerEnd.y === rulerStart.y)) {
                  // Second click - fix ruler end point
                  setRulerEnd(canvasPos);
                } else {
                  // Third click - reset ruler
                  setRulerStart(null);
                  setRulerEnd(null);
                }
                return;
              }

              // Text tool
              if (tool === "text") {
                const text = prompt("Enter text:");
                if (text) {
                  const snappedX = gridSettings.snapToGrid
                    ? snapToGrid(canvasPos.x, gridSettings.size, gridSettings.offsetX)
                    : canvasPos.x;
                  const snappedY = gridSettings.snapToGrid
                    ? snapToGrid(canvasPos.y, gridSettings.size, gridSettings.offsetY)
                    : canvasPos.y;
                  const newText = {
                    id: `text-${Date.now()}`,
                    type: "text",
                    x: snappedX,
                    y: snappedY,
                    text: text,
                    color: drawColor,
                    fontSize: 24,
                  };
                  setLayers(prev => ({
                    ...prev,
                    objects: {
                      ...prev.objects,
                      objects: [...prev.objects.objects, newText],
                    },
                  }));
                }
                return;
              }

              // Ping tool
              if (tool === "ping") {
                setPingPosition(canvasPos);
                // Broadcast ping to TV
                if (tvChannel) {
                  tvChannel.send({
                    type: "broadcast",
                    event: "ping",
                    payload: { x: canvasPos.x, y: canvasPos.y, sceneId: scene.id },
                  });
                }
                // Auto-clear ping after 2 seconds
                setTimeout(() => setPingPosition(null), 2000);
                return;
              }

              // Fog of war tools - Ora tutti gli strumenti NASCONDONO (aggiungono a hiddenAreas)
              if (tool === "fog" && pageSettings.fogOfWar.enabled) {
                if (fogMode === "rect") {
                  setFogRevealStart({ x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 });
                } else if (fogMode === "brush") {
                  // Aggiungi cerchio alle aree nascoste
                  hideFogArea({ type: "circle", cx: canvasPos.x, cy: canvasPos.y, radius: fogBrushSize });
                  setIsDrawing(true);
                } else if (fogMode === "polygon") {
                  // Aggiungi punto al poligono
                  setFogPolygonPoints(prev => [...prev, canvasPos.x, canvasPos.y]);
                }
                return;
              }

              if (clickedOnEmpty && tool === "select") {
                setSelectedId(null);
                setSelectedLayer(null);
              }
            }}
            onMouseMove={(e) => {
              const stage = e.target.getStage();
              const pos = stage.getPointerPosition();
              const canvasPos = {
                x: (pos.x - stagePos.x) / stageScale,
                y: (pos.y - stagePos.y) / stageScale,
              };

              // Cursor grid position disabled to prevent flickering
              // If you need it, uncomment and increase throttle value (e.g., 500ms)
              // const gSize = gridSettings?.size || 40;
              // const now = Date.now();
              // if (now - lastCursorUpdate.current > 500) {
              //   lastCursorUpdate.current = now;
              //   setCursorGridPos({
              //     col: Math.floor((canvasPos.x - (gridSettings?.offsetX || 0)) / gSize) + 1,
              //     row: Math.floor((canvasPos.y - (gridSettings?.offsetY || 0)) / gSize) + 1,
              //   });
              // }

              // View mode: aggiorna misura
              if (mode !== "edit") {
                if (viewMeasure) {
                  setViewMeasure(prev => prev ? { ...prev, endX: canvasPos.x, endY: canvasPos.y } : null);
                }
                return;
              }

              if (gridAlignMode && alignStart) {
                setAlignEnd(canvasPos);
              }

              // Drawing freehand
              if (isDrawing && currentDrawing?.type === "freehand") {
                setCurrentDrawing({
                  ...currentDrawing,
                  points: [...currentDrawing.points, canvasPos.x, canvasPos.y],
                });
              }

              // Drawing shapes
              if (isDrawing && ["rectangle", "circle", "line"].includes(currentDrawing?.type)) {
                const snappedPos = gridSettings.snapToGrid
                  ? {
                      x: snapToGrid(canvasPos.x, gridSettings.size, gridSettings.offsetX),
                      y: snapToGrid(canvasPos.y, gridSettings.size, gridSettings.offsetY),
                    }
                  : canvasPos;
                setCurrentDrawing({
                  ...currentDrawing,
                  end: snappedPos,
                });
              }

              // Ruler preview
              if (tool === "ruler" && rulerStart) {
                setRulerEnd(canvasPos);
              }

              if (tool === "fog" && fogRevealStart && fogMode === "rect") {
                setFogRevealStart({
                  ...fogRevealStart,
                  width: canvasPos.x - fogRevealStart.x,
                  height: canvasPos.y - fogRevealStart.y,
                });
              }

              // Brush fog — continua ad aggiungere cerchi durante drag
              if (tool === "fog" && isDrawing && fogMode === "brush") {
                hideFogArea({ type: "circle", cx: canvasPos.x, cy: canvasPos.y, radius: fogBrushSize });
              }
            }}
            onMouseUp={(e) => {
              // View mode: completa misura
              if (mode !== "edit") {
                // Misura resta visibile fino al prossimo click
                return;
              }

              // === EDIT MODE ===
              // Complete drawing
              if (isDrawing && currentDrawing) {
                const newDrawing = {
                  id: `drawing-${Date.now()}`,
                  ...currentDrawing,
                };

                // Add to objects layer
                setLayers(prev => ({
                  ...prev,
                  objects: {
                    ...prev.objects,
                    objects: [...prev.objects.objects, newDrawing],
                  },
                }));

                setIsDrawing(false);
                setCurrentDrawing(null);
              }

              // Complete fog drawing (rettangolo)
              if (tool === "fog" && fogRevealStart && fogMode === "rect" && (fogRevealStart.width !== 0 || fogRevealStart.height !== 0)) {
                const x = fogRevealStart.width < 0 ? fogRevealStart.x + fogRevealStart.width : fogRevealStart.x;
                const y = fogRevealStart.height < 0 ? fogRevealStart.y + fogRevealStart.height : fogRevealStart.y;
                const width = Math.abs(fogRevealStart.width);
                const height = Math.abs(fogRevealStart.height);

                hideFogArea({ type: "rect", x, y, width, height });
                setFogRevealStart(null);
              }

              // Stop brush drawing
              if (tool === "fog" && isDrawing && fogMode === "brush") {
                setIsDrawing(false);
              }
            }}
            onDragEnd={(e) => {
              if (mode !== "edit" || tool === "pan") {
                setStagePos({ x: e.target.x(), y: e.target.y() });
                if (mode === "edit") setTimeout(updateTransformer, 0);
              }
            }}
          >
            {/* Background */}
            <Layer>
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fill={pageSettings.backgroundColor}
                onClick={() => {
                  if (tool === "select") {
                    setSelectedId(null);
                    setSelectedLayer(null);
                  }
                }}
              />
            </Layer>

            {/* MAP Layer */}
            <Layer name="map-layer" listening={currentLayer === "map" || tool === "erase"}>
              {layers.map.visible && layers.map.objects.map((obj) => (
                <KonvaImageObject key={obj.id} obj={obj} layerName="map" />
              ))}
            </Layer>

            {/* GRID Layer - MUST be above MAP to be visible */}
            {gridSettings.enabled && (
            <Layer listening={false}>
              {gridLines}


              {/* Grid Alignment Rectangle */}
              {gridAlignMode && alignStart && alignEnd && (
                <Rect
                  x={Math.min(alignStart.x, alignEnd.x)}
                  y={Math.min(alignStart.y, alignEnd.y)}
                  width={Math.abs(alignEnd.x - alignStart.x)}
                  height={Math.abs(alignEnd.y - alignStart.y)}
                  stroke="#00ff00"
                  strokeWidth={3}
                  dash={[10, 5]}
                  listening={false}
                />
              )}
            </Layer>
            )}

            {/* OBJECTS Layer */}
            <Layer name="objects-layer" listening={currentLayer === "objects" || tool === "erase"}>
              {layers.objects.visible && layers.objects.objects.map((obj) => {
                // Render drawings (freehand, shapes)
                if (obj.type === "freehand") {
                  return (
                    <Line
                      key={obj.id}
                      points={obj.points}
                      stroke={obj.color}
                      strokeWidth={obj.width}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation="source-over"
                      hitStrokeWidth={tool === "erase" ? 20 : obj.width}
                      onMouseEnter={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "pointer";
                          e.target.opacity(0.5);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "default";
                          e.target.opacity(1);
                        }
                      }}
                      onClick={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                      onTap={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                    />
                  );
                }
                if (obj.type === "line") {
                  return (
                    <Line
                      key={obj.id}
                      points={[obj.start.x, obj.start.y, obj.end.x, obj.end.y]}
                      stroke={obj.color}
                      strokeWidth={obj.width}
                      lineCap="round"
                      hitStrokeWidth={tool === "erase" ? 20 : obj.width}
                      onMouseEnter={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "pointer";
                          e.target.opacity(0.5);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "default";
                          e.target.opacity(1);
                        }
                      }}
                      onClick={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                      onTap={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                    />
                  );
                }
                if (obj.type === "rectangle") {
                  const x = Math.min(obj.start.x, obj.end.x);
                  const y = Math.min(obj.start.y, obj.end.y);
                  const width = Math.abs(obj.end.x - obj.start.x);
                  const height = Math.abs(obj.end.y - obj.start.y);
                  return (
                    <Rect
                      key={obj.id}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      stroke={obj.color}
                      strokeWidth={obj.width}
                      onMouseEnter={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "pointer";
                          e.target.opacity(0.5);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "default";
                          e.target.opacity(1);
                        }
                      }}
                      onClick={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                      onTap={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                    />
                  );
                }
                if (obj.type === "circle") {
                  const radius = Math.sqrt(
                    Math.pow(obj.end.x - obj.start.x, 2) + Math.pow(obj.end.y - obj.start.y, 2)
                  );
                  return (
                    <Circle
                      key={obj.id}
                      x={obj.start.x}
                      y={obj.start.y}
                      radius={radius}
                      stroke={obj.color}
                      strokeWidth={obj.width}
                      onMouseEnter={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "pointer";
                          e.target.opacity(0.5);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "default";
                          e.target.opacity(1);
                        }
                      }}
                      onClick={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                      onTap={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                    />
                  );
                }
                if (obj.type === "text") {
                  return (
                    <KonvaText
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      text={obj.text}
                      fontSize={obj.fontSize || 24}
                      fill={obj.color}
                      fontStyle="bold"
                      shadowColor="rgba(0,0,0,0.8)"
                      shadowBlur={4}
                      shadowOffset={{ x: 2, y: 2 }}
                      onMouseEnter={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "pointer";
                          e.target.opacity(0.5);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tool === "erase") {
                          e.target.getStage().container().style.cursor = "default";
                          e.target.opacity(1);
                        }
                      }}
                      onClick={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                      onTap={() => {
                        if (tool === "erase") {
                          deleteObject("objects", obj.id);
                        }
                      }}
                    />
                  );
                }
                // Render images
                return <KonvaImageObject key={obj.id} obj={obj} layerName="objects" />;
              })}

              {/* Current drawing preview */}
              {currentDrawing && (
                <>
                  {currentDrawing.type === "freehand" && (
                    <Line
                      points={currentDrawing.points}
                      stroke={currentDrawing.color}
                      strokeWidth={currentDrawing.width}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation="source-over"
                    />
                  )}
                  {currentDrawing.type === "line" && (
                    <Line
                      points={[currentDrawing.start.x, currentDrawing.start.y, currentDrawing.end.x, currentDrawing.end.y]}
                      stroke={currentDrawing.color}
                      strokeWidth={currentDrawing.width}
                      lineCap="round"
                    />
                  )}
                  {currentDrawing.type === "rectangle" && (
                    <Rect
                      x={Math.min(currentDrawing.start.x, currentDrawing.end.x)}
                      y={Math.min(currentDrawing.start.y, currentDrawing.end.y)}
                      width={Math.abs(currentDrawing.end.x - currentDrawing.start.x)}
                      height={Math.abs(currentDrawing.end.y - currentDrawing.start.y)}
                      stroke={currentDrawing.color}
                      strokeWidth={currentDrawing.width}
                    />
                  )}
                </>
              )}
            </Layer>

            {/* TOKENS Layer */}
            <Layer name="tokens-layer" listening={currentLayer === "tokens" || tool === "erase"}>
              {layers.tokens.visible && layers.tokens.objects.map((obj) => {
                // Only extract config for character tokens
                if (!obj.characterId) {
                  // Regular token (taverna, bosco, etc.)
                  return <KonvaImageObject key={obj.id} obj={obj} layerName="tokens" />;
                }

                // Character token - extract config
                const config = obj.tokenConfig || {};
                const showHPBar = config.showHPBar !== false;
                const showName = config.showName !== false;
                const showACBadge = config.showACBadge !== false;

                return <CharacterToken key={obj.id} obj={obj} />;
              })}
            </Layer>

            {/* GM Layer - Hidden in view mode (for players) */}
            {mode === "edit" && (
              <Layer name="gm-layer">
                {layers.gm.visible && layers.gm.objects.map((obj) => (
                  <KonvaImageObject key={obj.id} obj={obj} layerName="gm" />
                ))}
              </Layer>
            )}

            {/* Ruler & Ping Overlay Layer */}
            <Layer listening={false}>
              {/* Ruler */}
              {rulerStart && rulerEnd && (
                <>
                  <Line
                    points={[rulerStart.x, rulerStart.y, rulerEnd.x, rulerEnd.y]}
                    stroke="#4a9eff"
                    strokeWidth={3}
                    dash={[10, 5]}
                    lineCap="round"
                  />
                  <Circle
                    x={rulerStart.x}
                    y={rulerStart.y}
                    radius={8}
                    fill="#4a9eff"
                  />
                  <Circle
                    x={rulerEnd.x}
                    y={rulerEnd.y}
                    radius={8}
                    fill="#4a9eff"
                  />
                  {/* Distance label */}
                  <KonvaText
                    x={(rulerStart.x + rulerEnd.x) / 2 - 40}
                    y={(rulerStart.y + rulerEnd.y) / 2 - 20}
                    text={(() => {
                      const dx = rulerEnd.x - rulerStart.x;
                      const dy = rulerEnd.y - rulerStart.y;
                      const pixels = Math.sqrt(dx * dx + dy * dy);
                      const squares = pixels / gridSettings.size;
                      const distance = (squares * gridSettings.scale).toFixed(1);
                      return `${distance} ${gridSettings.scaleUnit}`;
                    })()}
                    fontSize={18}
                    fill="#4a9eff"
                    fontStyle="bold"
                    padding={6}
                    align="center"
                    shadowColor="rgba(0,0,0,0.8)"
                    shadowBlur={4}
                    shadowOffset={{ x: 0, y: 0 }}
                  />
                </>
              )}

              {/* Ping */}
              {pingPosition && (
                <>
                  <Circle
                    x={pingPosition.x}
                    y={pingPosition.y}
                    radius={30}
                    stroke="#ff6b6b"
                    strokeWidth={4}
                    opacity={0.8}
                  />
                  <Circle
                    x={pingPosition.x}
                    y={pingPosition.y}
                    radius={15}
                    fill="#ff6b6b"
                    opacity={0.6}
                  />
                </>
              )}
            </Layer>

            {/* Fog of War Layer - Mostra solo le aree NASCOSTE (disegnate dal DM) */}
            {pageSettings.fogOfWar.enabled && pageSettings.mapImage && (
              <Layer listening={tool === "fog"}>
                {/* Aree nascoste - Semi-trasparente in EDIT, opache in VIEW */}
                {(pageSettings.fogOfWar.hiddenAreas || []).map((area, idx) => {
                  const fogOpacity = mode === "edit" ? 0.4 : 0.98;
                  if (area.type === "circle") {
                    return (
                      <Circle key={`h-${idx}`}
                        x={area.cx} y={area.cy} radius={area.radius}
                        fill={`rgba(0, 0, 0, ${fogOpacity})`}
                        listening={false}
                      />
                    );
                  }
                  if (area.type === "polygon" && area.points?.length >= 4) {
                    return (
                      <Line key={`h-${idx}`}
                        points={area.points} closed
                        fill={`rgba(0, 0, 0, ${fogOpacity})`}
                        listening={false}
                      />
                    );
                  }
                  return (
                    <Rect key={`h-${idx}`}
                      x={area.x} y={area.y}
                      width={area.width} height={area.height}
                      fill={`rgba(0, 0, 0, ${fogOpacity})`}
                      listening={false}
                    />
                  );
                })}

                {/* Preview del fog reveal in corso (rettangolo tratteggiato) */}
                {fogRevealStart && fogMode === "rect" && (
                  <Rect
                    x={fogRevealStart.width < 0 ? fogRevealStart.x + fogRevealStart.width : fogRevealStart.x}
                    y={fogRevealStart.height < 0 ? fogRevealStart.y + fogRevealStart.height : fogRevealStart.y}
                    width={Math.abs(fogRevealStart.width || 0)}
                    height={Math.abs(fogRevealStart.height || 0)}
                    stroke="rgba(76,175,80,0.8)" strokeWidth={2 / stageScale}
                    dash={[8 / stageScale, 4 / stageScale]}
                    fill="rgba(76,175,80,0.15)"
                    listening={false}
                  />
                )}

                {/* Preview polygon in costruzione */}
                {fogPolygonPoints.length >= 2 && fogMode === "polygon" && (
                  <Line
                    points={fogPolygonPoints}
                    stroke="rgba(76,175,80,0.8)" strokeWidth={2 / stageScale}
                    dash={[8 / stageScale, 4 / stageScale]}
                    fill="rgba(76,175,80,0.1)" closed={fogPolygonPoints.length >= 6}
                    listening={false}
                  />
                )}
              </Layer>
            )}

          </Stage>

          {/* Context Menu */}
          <AnimatePresence>
            {contextMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: contextMenu.x,
                  top: contextMenu.y,
                  background: "rgba(25,25,28,0.96)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  padding: "4px",
                  minWidth: 200,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)",
                  zIndex: 10000,
                }}
              >
                {contextMenu.layerName === "map" && (
                  <motion.button
                    whileHover={{ background: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAsMainMap(contextMenu.layerName, contextMenu.objectId)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.9)",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      transition: "all 0.1s ease",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Set as Main Map
                  </motion.button>
                )}
                {contextMenu.layerName === "map" && (
                  <div style={{
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    margin: "4px 0",
                  }} />
                )}
                <motion.button
                  whileHover={{ background: "rgba(239,68,68,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    deleteObject(contextMenu.layerName, contextMenu.objectId);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(239,68,68,0.95)",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 4,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    transition: "all 0.1s ease",
                    letterSpacing: "0.01em",
                  }}
                >
                  Delete
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ ZOOM BAR VERTICALE ═══ */}
          <AnimatePresence>
            {showZoomControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", bottom: 16, right: 16,
                display: "flex", flexDirection: "column", gap: 10,
                zIndex: 50, alignItems: "center",
              }}>
              {/* Zoom controls verticali */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: "rgba(10,8,6,0.9)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 8, padding: "8px 6px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
              }}>
              <button onClick={() => setStageScale(Math.min(stageScale * 1.2, 5))}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                  color: "var(--gold)", cursor: "pointer", fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>

              <div style={{ position: "relative", width: 28, height: 120 }}>
                <input type="range" min="10" max="500" step="5"
                  value={Math.min(Math.max(stageScale * 100, 10), 500)}
                  onChange={(e) => setStageScale(Number(e.target.value) / 100)}
                  style={{
                    position: "absolute", width: 120, height: 28,
                    left: "50%", top: "50%",
                    transform: "translate(-50%, -50%) rotate(-90deg)",
                    WebkitAppearance: "none", appearance: "none",
                    background: "transparent", cursor: "pointer",
                  }}
                />
                <div style={{
                  position: "absolute", left: "50%", top: 4, bottom: 4,
                  width: 3, marginLeft: -1.5, borderRadius: 2,
                  background: "rgba(212,175,55,0.15)", pointerEvents: "none",
                }}>
                  <div style={{
                    position: "absolute", bottom: 0, width: "100%", borderRadius: 2,
                    height: `${Math.min(Math.max(((stageScale * 100 - 10) / 490) * 100, 0), 100)}%`,
                    background: "rgba(212,175,55,0.5)",
                    transition: "height 0.2s ease-out",
                  }} />
                </div>
              </div>

              <button onClick={() => setStageScale(Math.max(stageScale / 1.2, 0.1))}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                  color: "var(--gold)", cursor: "pointer", fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>-</button>

              <div style={{ fontSize: "0.55rem", color: "var(--gold)", fontWeight: 600 }}>
                {(stageScale * 100).toFixed(0)}%
              </div>

              <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
                title="Reset zoom"
                style={{
                  width: 28, height: 20, borderRadius: 4,
                  background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                  color: "rgba(212,175,55,0.6)", cursor: "pointer",
                  fontSize: "0.5rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>FIT</button>
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SETTINGS PANEL - Only in edit mode */}
      {mode === "edit" && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          style={{
            width: 380,
            minWidth: 380,
            flexShrink: 0,
            background: "linear-gradient(180deg, rgba(20,18,15,0.98) 0%, rgba(15,13,10,0.98) 100%)",
            borderLeft: "1px solid rgba(212,175,55,0.3)",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          style={{ display: "none" }}
        />

        {/* Load Image Button */}
        <motion.button
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={uploading}
          style={{
            margin: "16px 16px 12px",
            padding: "14px",
            background: uploading
              ? "rgba(212,175,55,0.15)"
              : "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.15))",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 8,
            color: "var(--gold)",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "0.8rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Caricamento..." : "↑ Carica Immagine"}
        </motion.button>

        <div style={{
          fontSize: "0.65rem",
          color: "rgba(255,255,255,0.4)",
          textAlign: "center",
          marginBottom: 16,
          padding: "0 16px",
        }}>
          o trascina sul canvas
        </div>

        {/* Layers */}
        <CollapsibleSection id="layers" title="Livelli" icon="⧉">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "map", label: "Mappa", icon: GiScrollQuill },
              { id: "objects", label: "Oggetti", icon: GiWoodPile },
              { id: "tokens", label: "Token", icon: GiCrossedSwords },
              { id: "gm", label: "Solo GM", icon: GiEvilEyes },
            ].map((layer) => {
              const Icon = layer.icon;
              return (
                <motion.button
                  key={layer.id}
                  onClick={() => setCurrentLayer(layer.id)}
                  whileHover={{ background: "rgba(212,175,55,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "10px 12px",
                    background: currentLayer === layer.id
                      ? "rgba(212,175,55,0.2)"
                      : "transparent",
                    border: "none",
                    borderLeft: currentLayer === layer.id
                      ? "3px solid var(--gold)"
                      : "3px solid transparent",
                    borderRadius: 4,
                    color: currentLayer === layer.id ? "var(--gold)" : "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                    fontSize: "0.8rem",
                    fontWeight: currentLayer === layer.id ? 700 : 500,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon style={{ fontSize: "1.2rem" }} />
                    {layer.label}
                  </div>
                  <div style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.4)",
                    background: "rgba(0,0,0,0.3)",
                    padding: "2px 8px",
                    borderRadius: 12,
                    minWidth: 24,
                    textAlign: "center",
                  }}>
                    {layers[layer.id].objects.length}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Player Characters Library */}
        <CollapsibleSection id="characters" title="Gruppo" icon={<GiBorderedShield />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {characters.length === 0 ? (
              <div style={{
                padding: "20px 12px",
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.75rem",
              }}>
                Nessun personaggio creato.
                <br />
                I giocatori devono unirsi alla campagna!
              </div>
            ) : (
              characters.map((char) => (
                <motion.button
                  key={char.id}
                  onClick={() => setTokenEditorModal({
                    isOpen: true,
                    character: char,
                    config: {
                      size: "medium",
                      showHPBar: true,
                      showName: true,
                      showACBadge: true,
                      borderStyle: "solid",
                    },
                  })}
                  whileHover={{ scale: 1.02, background: "rgba(64,175,255,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${char.token_color || '#4070c0'}40`,
                    borderRadius: 6,
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.15s ease",
                  }}
                >
                  {char.avatar_url ? (
                    <img
                      src={char.avatar_url}
                      alt={char.name}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `2px solid ${char.token_color || '#4070c0'}`,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `${char.token_color || '#4070c0'}30`,
                      border: `2px solid ${char.token_color || '#4070c0'}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      color: char.token_color || '#4070c0',
                    }}>
                      {char.name?.[0] || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: char.token_color || "var(--gold)",
                    }}>
                      {char.name}
                    </div>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                      {char.class} • HP {char.hp_max} • AC {char.armor_class}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </CollapsibleSection>

        {/* NPC Library */}
        <CollapsibleSection id="npcs" title="NPC Libreria" icon={<FaUsers />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {npcs.length === 0 ? (
              <div style={{
                padding: "20px 12px",
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.75rem",
              }}>
                Nessun NPC creato.
                <br />
                Crea NPC nella sezione DM per usarli come token!
              </div>
            ) : (
              npcs.map((npc) => (
                <motion.button
                  key={npc.id}
                  onClick={() => addNPCAsToken(npc)}
                  whileHover={{ scale: 1.02, background: "rgba(212,175,55,0.12)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 6,
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.15s ease",
                  }}
                >
                  {npc.avatar_url ? (
                    <img
                      src={npc.avatar_url}
                      alt={npc.name}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid rgba(212,175,55,0.4)",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(212,175,55,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                    }}>
                      ?
                    </div>
                  )}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--gold)",
                    }}>
                      {npc.name}
                    </div>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                      {npc.class} • HP {npc.hp_max} • AC {npc.armor_class}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </CollapsibleSection>

        {/* Drawing Settings */}
        <CollapsibleSection id="drawing" title="Drawing" icon="✎">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Color */}
            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                fontSize: "0.7rem",
                color: "rgba(212,175,55,0.9)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Color
              </label>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                style={{
                  width: "100%",
                  height: 42,
                  border: "2px solid rgba(212,175,55,0.4)",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "rgba(0,0,0,0.3)",
                }}
              />
            </div>

            {/* Line Width */}
            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                fontSize: "0.7rem",
                color: "rgba(212,175,55,0.9)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Width: {drawWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={drawWidth}
                onChange={(e) => setDrawWidth(Number(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Clear Ruler */}
            {rulerStart && (
              <button
                onClick={() => {
                  setRulerStart(null);
                  setRulerEnd(null);
                }}
                style={{
                  padding: "10px",
                  background: "rgba(255,100,100,0.2)",
                  border: "1px solid rgba(255,100,100,0.4)",
                  borderRadius: 6,
                  color: "#ff6464",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                Clear Ruler
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* Grid */}
        <CollapsibleSection id="grid" title="Griglia" icon={<BsGrid3X3 />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Toggle */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
              }}>
                Mostra Griglia
              </span>
              <div
                onClick={() => setGridSettings({ ...gridSettings, enabled: !gridSettings.enabled })}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: gridSettings.enabled
                    ? "linear-gradient(135deg, rgba(212,175,55,0.8), rgba(212,175,55,0.5))"
                    : "rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: gridSettings.enabled
                    ? "1px solid rgba(212,175,55,0.6)"
                    : "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <motion.div
                  animate={{
                    x: gridSettings.enabled ? 20 : 2,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: gridSettings.enabled
                      ? "#fff"
                      : "rgba(255,255,255,0.7)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>

            {/* Snap to Grid */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
              }}>
                Aggancia alla Griglia
              </span>
              <div
                onClick={() => setGridSettings({ ...gridSettings, snapToGrid: !gridSettings.snapToGrid })}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: gridSettings.snapToGrid
                    ? "linear-gradient(135deg, rgba(212,175,55,0.8), rgba(212,175,55,0.5))"
                    : "rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: gridSettings.snapToGrid
                    ? "1px solid rgba(212,175,55,0.6)"
                    : "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <motion.div
                  animate={{
                    x: gridSettings.snapToGrid ? 20 : 2,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: gridSettings.snapToGrid
                      ? "#fff"
                      : "rgba(255,255,255,0.7)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>

            {/* Alignment Tool */}
            {pageSettings.mapImage && (
              <motion.button
                onClick={gridAlignMode ? applyGridAlignment : startGridAlignment}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "10px",
                  background: gridAlignMode
                    ? "linear-gradient(135deg, rgba(0,255,0,0.25), rgba(0,255,0,0.15))"
                    : "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.15))",
                  border: gridAlignMode ? "1px solid rgba(0,255,0,0.6)" : "1px solid rgba(212,175,55,0.4)",
                  borderRadius: 6,
                  color: gridAlignMode ? "#00ff00" : "var(--gold)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {gridAlignMode
                  ? (alignStart && alignEnd ? "Applica Allineamento" : "Traccia Quadrato 3x3...")
                  : "Allinea Griglia"}
              </motion.button>
            )}

            {gridAlignMode && (
              <motion.button
                onClick={() => {
                  setGridAlignMode(false);
                  setAlignStart(null);
                  setAlignEnd(null);
                }}
                whileHover={{ background: "rgba(255,0,0,0.2)" }}
                style={{
                  padding: "8px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,0,0,0.3)",
                  borderRadius: 6,
                  color: "#ff6666",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                Annulla
              </motion.button>
            )}

            {/* Size */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
              }}>
                Dimensione: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{gridSettings.size}px</span>
              </label>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={gridSettings.size}
                onChange={(e) => setGridSettings({ ...gridSettings, size: parseInt(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
            </div>

            {/* Scale */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block",
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 6,
                }}>
                  Scala
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={gridSettings.scale}
                  onChange={(e) => setGridSettings({ ...gridSettings, scale: parseInt(e.target.value) || 5 })}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 4,
                    color: "var(--gold)",
                    fontSize: "0.75rem",
                  }}
                />
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.6)",
                marginTop: 20,
              }}>
                {gridSettings.scaleUnit} / quadretto
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
              }}>
                Opacità: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{(gridSettings.opacity * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={gridSettings.opacity}
                onChange={(e) => setGridSettings({ ...gridSettings, opacity: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
            </div>

            {/* Color */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
              }}>
                Colore
              </label>
              <input
                type="color"
                value={gridSettings.color}
                onChange={(e) => setGridSettings({ ...gridSettings, color: e.target.value })}
                style={{
                  width: "100%",
                  height: 36,
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "transparent",
                }}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Page */}
        <CollapsibleSection id="page" title="Pagina" icon="◈">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Main Map Info */}
            {pageSettings.mapImage ? (
              <div style={{
                padding: "12px",
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: 8,
              }}>
                <div style={{
                  fontSize: "0.7rem",
                  color: "var(--gold)",
                  fontWeight: 700,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <GiScrollQuill /> Mappa Principale Attiva
                </div>
                <div style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 8,
                }}>
                  Griglia copre {Math.round(pageSettings.mapImage.width)}x{Math.round(pageSettings.mapImage.height)}px
                </div>
                <motion.button
                  onClick={clearMainMap}
                  whileHover={{ background: "rgba(255,0,0,0.2)" }}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,0,0,0.3)",
                    borderRadius: 6,
                    color: "#ff6666",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  Rimuovi Mappa Principale
                </motion.button>
              </div>
            ) : (
              <div style={{
                padding: "12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
              }}>
                Nessuna mappa principale impostata. Click destro su una mappa → "Imposta come Mappa Principale" per applicare la griglia solo su quell'immagine.
              </div>
            )}

            {/* Fog of War */}
            {pageSettings.mapImage ? (
              <div style={{
                padding: "12px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                marginTop: 12,
              }}>
                <div style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--gold)",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Nebbia di Guerra
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                  }}>
                    Abilita Nebbia
                  </span>
                  <div
                    onClick={toggleFogOfWar}
                    style={{
                      position: "relative",
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: pageSettings.fogOfWar.enabled
                        ? "linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.5))"
                        : "rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      border: pageSettings.fogOfWar.enabled
                        ? "1px solid rgba(76,175,80,0.6)"
                        : "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <motion.div
                      animate={{
                        x: pageSettings.fogOfWar.enabled ? 20 : 2,
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        position: "absolute",
                        top: 2,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: pageSettings.fogOfWar.enabled
                          ? "#fff"
                          : "rgba(255,255,255,0.7)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                </div>

                {pageSettings.fogOfWar.enabled && (
                  <>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 10,
                    }}>
                      Usa il tool "Nebbia" per nascondere aree. {(pageSettings.fogOfWar.hiddenAreas || []).length} aree nascoste.
                    </div>
                    {(pageSettings.fogOfWar.hiddenAreas || []).length > 0 && (
                      <motion.button
                        onClick={revealAllFog}
                        whileHover={{ background: "rgba(76,175,80,0.2)" }}
                        style={{
                          width: "100%",
                          padding: "6px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(76,175,80,0.3)",
                          borderRadius: 6,
                          color: "#4caf50",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        Rimuovi Tutte le Aree Nascoste
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{
                padding: "12px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                border: "1px solid rgba(255,215,0,0.2)",
                marginTop: 12,
              }}>
                <div style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "rgba(255,215,0,0.6)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Nebbia di Guerra
                </div>
                <div style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.4",
                }}>
                  Imposta prima una mappa principale per usare la nebbia di guerra.
                </div>
              </div>
            )}

            {/* Background Color */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 6,
              }}>
                Colore Sfondo
              </label>
              <input
                type="color"
                value={pageSettings.backgroundColor}
                onChange={(e) => setPageSettings({ ...pageSettings, backgroundColor: e.target.value })}
                style={{
                  width: "100%",
                  height: 36,
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "transparent",
                }}
              />
            </div>
          </div>
        </CollapsibleSection>
      </motion.div>
      )}

      {/* Layer Selection Modal - Only in edit mode */}
      {mode === "edit" && (
      <AnimatePresence>
        {pendingUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingUpload(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(145deg, rgba(30,25,20,0.98), rgba(20,15,12,0.98))",
                border: "2px solid rgba(212,175,55,0.5)",
                borderRadius: 16,
                padding: "32px",
                minWidth: 400,
                maxWidth: 500,
              }}
            >
              <div style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--gold)",
                marginBottom: 8,
                fontFamily: "var(--font-heading)",
              }}>
                Scegli il Livello
              </div>
              <div style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.6)",
                marginBottom: 24,
              }}>
                Seleziona su quale livello posizionare questa immagine
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: "map", label: "Livello Mappa", icon: GiScrollQuill, desc: "Mappe di sfondo (sotto la griglia)" },
                  { id: "objects", label: "Livello Oggetti", icon: GiWoodPile, desc: "Oggetti e props (sopra la griglia)" },
                  { id: "tokens", label: "Livello Token", icon: GiCrossedSwords, desc: "Token personaggi (sopra la griglia)" },
                  { id: "gm", label: "Livello Solo GM", icon: GiEvilEyes, desc: "Visibile solo al DM" },
                ].map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <motion.button
                      key={layer.id}
                      onClick={() => uploadFileToLayer(layer.id)}
                      whileHover={{ scale: 1.02, background: "rgba(212,175,55,0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: "16px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: 10,
                        color: "rgba(255,255,255,0.9)",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Icon style={{ fontSize: "2rem", color: "var(--gold)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 4 }}>
                          {layer.label}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                          {layer.desc}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                onClick={() => setPendingUpload(null)}
                whileHover={{ background: "rgba(255,255,255,0.1)" }}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Annulla
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* Token Editor Modal */}
      <AnimatePresence>
        {tokenEditorModal.isOpen && tokenEditorModal.character && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            onClick={() => setTokenEditorModal({ ...tokenEditorModal, isOpen: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                border: "2px solid var(--gold)",
                borderRadius: 16,
                padding: 32,
                maxWidth: 600,
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.2)",
              }}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.5rem",
                color: "var(--gold)",
                marginBottom: 24,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}>
                <GiCrossedSwords /> Editor Token
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Colonna sinistra - Anteprima */}
                <div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "var(--gold-dark)",
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}>
                    Anteprima Token
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: 12,
                    padding: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}>
                    {/* Token Preview */}
                    <div style={{
                      position: "relative",
                      width: tokenEditorModal.config.size === "small" ? 80 : tokenEditorModal.config.size === "large" ? 160 : 120,
                      height: tokenEditorModal.config.size === "small" ? 80 : tokenEditorModal.config.size === "large" ? 160 : 120,
                    }}>
                      {/* Token Circle */}
                      <div style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        border: tokenEditorModal.config.borderStyle === "double"
                          ? `4px double ${tokenEditorModal.character.token_color || '#4070c0'}`
                          : `3px solid ${tokenEditorModal.character.token_color || '#4070c0'}`,
                        boxShadow: tokenEditorModal.config.borderStyle === "glow"
                          ? `0 0 20px ${tokenEditorModal.character.token_color || '#4070c0'}, 0 0 40px ${tokenEditorModal.character.token_color || '#4070c0'}60`
                          : "0 4px 12px rgba(0,0,0,0.5)",
                        overflow: "hidden",
                        background: "#000",
                      }}>
                        {tokenEditorModal.character.avatar_url ? (
                          <img
                            src={tokenEditorModal.character.avatar_url}
                            alt={tokenEditorModal.character.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                            color: tokenEditorModal.character.token_color || '#4070c0',
                            fontFamily: "var(--font-heading)",
                          }}>
                            {tokenEditorModal.character.name?.[0] || '?'}
                          </div>
                        )}
                      </div>

                      {/* HP Bar */}
                      {tokenEditorModal.config.showHPBar && (
                        <div style={{
                          position: "absolute",
                          top: -16,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "90%",
                          height: 8,
                          background: "rgba(0,0,0,0.7)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: "100%",
                            height: "100%",
                            background: "#4ade80",
                          }} />
                        </div>
                      )}

                      {/* AC Badge */}
                      {tokenEditorModal.config.showACBadge && (
                        <div style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          border: "2px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                        }}>
                          {tokenEditorModal.character.armor_class || 10}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    {tokenEditorModal.config.showName && (
                      <div style={{
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        color: tokenEditorModal.character.token_color || '#4070c0',
                        fontFamily: "var(--font-heading)",
                        textAlign: "center",
                      }}>
                        {tokenEditorModal.character.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Colonna destra - Opzioni */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Dimensione */}
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--gold-dark)", marginBottom: 8, display: "block" }}>
                      Dimensione
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["small", "medium", "large"].map(size => (
                        <button
                          key={size}
                          onClick={() => setTokenEditorModal({
                            ...tokenEditorModal,
                            config: { ...tokenEditorModal.config, size },
                          })}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: tokenEditorModal.config.size === size ? "var(--gold)" : "rgba(255,255,255,0.1)",
                            border: `1px solid ${tokenEditorModal.config.size === size ? "var(--gold)" : "rgba(255,255,255,0.2)"}`,
                            borderRadius: 6,
                            color: tokenEditorModal.config.size === size ? "#000" : "#fff",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {size === "small" ? "S" : size === "medium" ? "M" : "L"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stile Bordo */}
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--gold-dark)", marginBottom: 8, display: "block" }}>
                      Stile Bordo
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { id: "solid", label: "Solido" },
                        { id: "double", label: "Doppio" },
                        { id: "glow", label: "Glow" },
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => setTokenEditorModal({
                            ...tokenEditorModal,
                            config: { ...tokenEditorModal.config, borderStyle: style.id },
                          })}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: tokenEditorModal.config.borderStyle === style.id ? "var(--gold)" : "rgba(255,255,255,0.1)",
                            border: `1px solid ${tokenEditorModal.config.borderStyle === style.id ? "var(--gold)" : "rgba(255,255,255,0.2)"}`,
                            borderRadius: 6,
                            color: tokenEditorModal.config.borderStyle === style.id ? "#000" : "#fff",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Options */}
                  {[
                    { key: "showHPBar", label: "Mostra HP Bar" },
                    { key: "showName", label: "Mostra Nome" },
                    { key: "showACBadge", label: "Mostra AC Badge" },
                  ].map(option => (
                    <div
                      key={option.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{option.label}</span>
                      <div
                        onClick={() => setTokenEditorModal({
                          ...tokenEditorModal,
                          config: { ...tokenEditorModal.config, [option.key]: !tokenEditorModal.config[option.key] },
                        })}
                        style={{
                          position: "relative",
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          background: tokenEditorModal.config[option.key]
                            ? "linear-gradient(135deg, rgba(212,175,55,0.8), rgba(212,175,55,0.5))"
                            : "rgba(255,255,255,0.15)",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          border: tokenEditorModal.config[option.key]
                            ? "1px solid rgba(212,175,55,0.6)"
                            : "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        <motion.div
                          animate={{
                            x: tokenEditorModal.config[option.key] ? 20 : 2,
                          }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          style={{
                            position: "absolute",
                            top: 2,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: tokenEditorModal.config[option.key]
                              ? "#fff"
                              : "rgba(255,255,255,0.7)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottoni */}
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button
                  onClick={() => setTokenEditorModal({ ...tokenEditorModal, isOpen: false })}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    addCharacterAsToken(tokenEditorModal.character, tokenEditorModal.config);
                    setTokenEditorModal({ ...tokenEditorModal, isOpen: false });
                  }}
                  style={{
                    flex: 2,
                    padding: "14px",
                    background: "var(--gold)",
                    border: "1px solid var(--gold)",
                    borderRadius: 8,
                    color: "#000",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    boxShadow: "0 0 20px rgba(212,175,55,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <GiCrossedSwords /> Crea Token sulla Mappa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Professionale */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
});

export default PageCanvas;
