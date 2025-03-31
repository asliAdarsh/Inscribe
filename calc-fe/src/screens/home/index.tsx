import { useState, useRef, useEffect, Fragment } from "react";
import "./inde.css";
import axios from "axios";
import { jsPDF } from "jspdf";
import * as ButtonImages from "./components/Button/button";
import { useNavigate } from "react-router-dom";
import getStroke from "perfect-freehand";

interface CanvasMetadata {
  id: number;
  name: string;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface SearchHistoryItem {
  timestamp: string;
  results: GeneratedResult[]; // This now includes steps
}
interface GeneratedResult {
  expression: string;
  answer: string;
  position: { x: number; y: number };
  steps?: string;
}
interface Response {
  expr: string;
  result: string;
  assign: boolean;
  steps: string;
}

interface DraggedImageInfo {
  img: HTMLImageElement | null;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  canvasSnapshot?: ImageData | null;
  selected?: boolean;
  tempX?: number;
  tempY?: number;
}

interface TextElement {
  id: string;
  text: string;
  position: { x: number; y: number };
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
  textAlign: string;
  deleted?: boolean; // Add this flag to track deleted text elements
}

const getSvgPathFromStroke = (stroke: number[][]) => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};

const useMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

export default function Home(): JSX.Element {
  const isMobile = useMobile();
  const [canvasesMetadata, setCanvasesMetadata] = useState<CanvasMetadata[]>(
    []
  );
  const [activeCanvasId, setActiveCanvasId] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<string>("#ffffff");
  const [penSize, setPenSize] = useState<number>(5);
  const [selectedTool, setSelectedTool] = useState<
    "pen" | "eraser" | "textBox" | "selection" | "eraser"
  >("pen");
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const canvasStates = useRef<
    Record<number, { undoStack: ImageData[]; redoStack: ImageData[] }>
  >({});
  const [draggedImageInfo, setDraggedImageInfo] =
    useState<DraggedImageInfo | null>(null);
  // Track which canvases have been initialized
  const initializedCanvases = useRef<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [reset, setReset] = useState<boolean>(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult[]>([]);
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isResultsSidebarOpen, setIsResultsSidebarOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [currentResults, setCurrentResults] = useState<GeneratedResult[]>([]);
  const [textBoxes, setTextBoxes] = useState<
    Array<{
      id: string;
      text: string;
      position: { x: number; y: number };
      width: number;
      height: number;
      fontSize: number;
      color: string;
    }>
  >([]);
  const [activeTextBox, setActiveTextBox] = useState<string | null>(null);
  const [resizing, setResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [selectedShape, setSelectedShape] = useState<
    "rectangle" | "circle" | "arrow" | "line" | "triangle" | null
  >(null);
  const [shapeStartPosition, setShapeStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showSidebarShapesDropdown, setShowSidebarShapesDropdown] =
    useState(false);
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    type: "image";
    element: any;
  } | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [textSelectionBox, setTextSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Make sure these state variables are defined
  const [textInputPosition, setTextInputPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showTextSelectionBox, setShowTextSelectionBox] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [originalCanvasState, setOriginalCanvasState] =
    useState<ImageData | null>(null);
  const [visibleSelectionBox, setVisibleSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userType = localStorage.getItem("userType");
    setIsLoggedIn(userType === "registered" || userType === "google");
  }, []);

  const handleLaunchPage = () => {
    // Add fade-out effect to current page
    const mainContainer = document.getElementById("root") || document.body;
    mainContainer.classList.add("fade-out");

    // Wait for animation to complete before navigating
    setTimeout(() => {
      navigate("/");
      // Reset the class after navigation
      setTimeout(() => {
        mainContainer.classList.remove("fade-out");
      }, 50);
    }, 300);
  };

  const handleLogout = () => {
    // Clear user data
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");

    // Add fade-out effect
    const mainContainer = document.getElementById("root") || document.body;
    mainContainer.classList.add("fade-out");

    // Navigate to launch page
    setTimeout(() => {
      navigate("/");
      setTimeout(() => {
        mainContainer.classList.remove("fade-out");
      }, 50);
    }, 300);
  };

  const handleInscribeBtn = () => {
    const mainContainer = document.getElementById("root") || document.body;
    mainContainer.classList.add("fade-out");

    // Navigate to launch page
    setTimeout(() => {
      navigate("/");
      setTimeout(() => {
        mainContainer.classList.remove("fade-out");
      }, 50);
    }, 300);
  };

  // const handleDashboard = () => {

  //   // Add fade-out effect
  //   const mainContainer = document.getElementById('root') || document.body;
  //   mainContainer.classList.add('fade-out');

  //   // Navigate to launch page
  //   setTimeout(() => {
  //     navigate('/dashboard');
  //     setTimeout(() => {
  //       mainContainer.classList.remove('fade-out');
  //     }, 50);
  //   }, 300);
  // };

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      for (const r of result) {
        renderLatexToCanvas(r.expression, r.answer, true);
      }
    }
    console.log(result);
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult([]);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRefs.current[activeCanvasId as number];

    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.style.background = "#1F2937";
      canvas.style.background = "#1F2937";
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };
    if (canvas) {
      loadCanvasFromLocalStorage(activeCanvasId as number, canvas);
    }

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (result.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [result, isResultsSidebarOpen]);

  const renderLatexToCanvas = (
    expression: string,
    answer: string,
    isMath: boolean
  ) => {
    const ensureString = (input: any): string => {
      return typeof input === "string" ? input : String(input);
    };

    const escapeForLatex = (input: string): string => {
      return input.replace(/_/g, "\\_");
    };

    const addSpacesBetweenWords = (input: string): string => {
      return input.split("").join(" ");
    };

    const safeExpression = ensureString(expression);
    const safeAnswer = ensureString(answer);

    const formattedExpression = isMath
      ? safeExpression
      : `\\text{${escapeForLatex(addSpacesBetweenWords(safeExpression))}}`;

    const formattedAnswer = isMath
      ? safeAnswer
      : `\\text{${escapeForLatex(addSpacesBetweenWords(safeAnswer))}}`;

    const latex = `\\(\\LARGE{${formattedExpression} \\quad = \\quad ${formattedAnswer}}\\)`;

    setLatexExpression((prevLatex) => [...prevLatex, latex]);
    const canvas = canvasRefs.current[activeCanvasId as number];
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [searchHistory, isResultsSidebarOpen]);

  useEffect(() => {
    if (selectedTool === "textBox" && activeCanvasId !== null) {
      const canvas = canvasRefs.current[activeCanvasId];
      if (!canvas) return;

      const handleCanvasClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setTextInputPosition({ x, y });
        setTextInputValue("");
        setTimeout(() => textInputRef.current?.focus(), 0);
      };
      canvas.addEventListener("click", handleCanvasClick);
      return () => canvas.removeEventListener("click", handleCanvasClick);
    }
  }, [selectedTool, activeCanvasId]);

  useEffect(() => {
    const preventZoom = (e: Event) => e.preventDefault();

    // Add event listeners
    document.addEventListener("dblclick", preventZoom, { passive: false });
    document.addEventListener("gesturestart", preventZoom);
    document.addEventListener("gesturechange", preventZoom);
    document.addEventListener("gestureend", preventZoom);

    return () => {
      document.removeEventListener("dblclick", preventZoom);
      document.removeEventListener("gesturestart", preventZoom);
      document.removeEventListener("gesturechange", preventZoom);
      document.removeEventListener("gestureend", preventZoom);
    };
  }, []);

  // Load settings from localStorage on initial render
  useEffect(() => {
    try {
      const savedCanvasesMetadata = localStorage.getItem("canvasesMetadata");
      const savedPenColor = localStorage.getItem("penColor");
      const savedPenSize = localStorage.getItem("penSize");
      const savedSelectedTool = localStorage.getItem("selectedTool");
      const savedActiveCanvasId = localStorage.getItem("activeCanvasId");

      if (savedCanvasesMetadata) {
        const parsedMetadata = JSON.parse(savedCanvasesMetadata);
        setCanvasesMetadata(parsedMetadata);
      } else {
        createNewCanvas();
      }

      if (savedPenColor) setPenColor(savedPenColor);
      if (savedPenSize) setPenSize(Number(savedPenSize));
      if (savedSelectedTool)
        setSelectedTool(savedSelectedTool as "pen" | "eraser" | "textBox");
      if (savedActiveCanvasId) setActiveCanvasId(Number(savedActiveCanvasId));
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      createNewCanvas();
    }
  }, []);

  // Initialize canvasStates for each canvas
  useEffect(() => {
    canvasesMetadata.forEach((canvas) => {
      if (!canvasStates.current[canvas.id]) {
        canvasStates.current[canvas.id] = {
          undoStack: [],
          redoStack: [],
        };
      }
    });

    // If there are canvases but no active canvas, set the first one as active
    if (canvasesMetadata.length > 0 && activeCanvasId === null) {
      setActiveCanvasId(canvasesMetadata[0].id);
    }
  }, [canvasesMetadata, activeCanvasId]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      if (canvasesMetadata.length > 0) {
        localStorage.setItem(
          "canvasesMetadata",
          JSON.stringify(canvasesMetadata)
        );
      }
      localStorage.setItem("penColor", penColor);
      localStorage.setItem("penSize", penSize.toString());
      localStorage.setItem("selectedTool", selectedTool);
      if (activeCanvasId !== null) {
        localStorage.setItem("activeCanvasId", activeCanvasId.toString());
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      alert("Your browser storage is full. Some data might not be saved.");
    }
  }, [canvasesMetadata, penColor, penSize, selectedTool, activeCanvasId]);

  // Initialize canvas dimensions and load saved canvases
  useEffect(() => {
    Object.entries(canvasRefs.current).forEach(([idStr, canvas]) => {
      const id = Number(idStr);
      if (canvas && !initializedCanvases.current.has(id)) {
        // Set initial dimensions
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 60;

        // Mark this canvas as initialized
        initializedCanvases.current.add(id);

        // Try to load canvas data from localStorage
        loadCanvasFromLocalStorage(id, canvas);
      }
    });
  }, [canvasesMetadata]);

  // Autosave canvas data periodically
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      // Save all initialized canvases
      initializedCanvases.current.forEach((id) => {
        const canvas = canvasRefs.current[id];
        if (canvas) {
          saveCanvasToLocalStorage(id, canvas);
        }
      });
    }, 10000); // Save every 10 seconds

    return () => clearInterval(autosaveInterval);
  }, []);

  // Resize canvases when window size changes
  useEffect(() => {
    const handleResize = () => {
      Object.entries(canvasRefs.current).forEach(([id, canvas]) => {
        if (canvas) {
          // Save the current canvas state
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );

            // Resize canvas
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight - 60;

            // Restore the canvas state
            ctx.putImageData(imageData, 0, 0);
          }
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history on update
  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const saveCanvasToLocalStorage = (
    canvasId: number,
    canvasElement: HTMLCanvasElement
  ): void => {
    try {
      const dataURL = canvasElement.toDataURL("image/png");
      localStorage.setItem(`canvas_${canvasId}`, dataURL);
      console.log(`Canvas ${canvasId} saved to localStorage`);
    } catch (error) {
      console.error(`Error saving canvas ${canvasId} to localStorage:`, error);
    }
  };

  const loadCanvasFromLocalStorage = (
    canvasId: number,
    canvasElement: HTMLCanvasElement
  ): void => {
    try {
      const dataURL = localStorage.getItem(`canvas_${canvasId}`);

      if (dataURL) {
        const ctx = canvasElement.getContext("2d");
        if (ctx) {
          const img = new Image();
          img.src = dataURL;
          img.onload = () => {
            ctx.drawImage(img, 0, 0);

            // Initialize the state with the loaded image data
            if (
              canvasStates.current[canvasId] &&
              canvasStates.current[canvasId].undoStack.length === 0
            ) {
              canvasStates.current[canvasId].undoStack.push(
                ctx.getImageData(
                  0,
                  0,
                  canvasElement.width,
                  canvasElement.height
                )
              );
            }
          };
          console.log(`Canvas ${canvasId} loaded from localStorage`);
        }
      } else {
        // If no saved data, initialize with empty state
        const ctx = canvasElement.getContext("2d");
        if (
          ctx &&
          canvasStates.current[canvasId] &&
          canvasStates.current[canvasId].undoStack.length === 0
        ) {
          canvasStates.current[canvasId].undoStack.push(
            ctx.getImageData(0, 0, canvasElement.width, canvasElement.height)
          );
        }
      }
    } catch (error) {
      console.error(
        `Error loading canvas ${canvasId} from localStorage:`,
        error
      );
    }
  };

  const createNewCanvas = (): void => {
    const newCanvasId = Date.now();
    const newCanvas: CanvasMetadata = {
      id: newCanvasId,
      name: `Canvas ${canvasesMetadata.length + 1}`,
    };

    setCanvasesMetadata((prev) => [...prev, newCanvas]);
    setActiveCanvasId(newCanvasId);

    // Initialize canvas state
    canvasStates.current[newCanvasId] = {
      undoStack: [],
      redoStack: [],
    };
  };

  const adjustTextPosition = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvasId: number
  ) => {
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate available space
    const rightSpace = rect.width - x;
    const bottomSpace = rect.height - y;

    // Minimum padding from edges
    const padding = 20;

    // Adjust position if too close to edges
    const adjustedX = Math.min(x, rect.width - padding);
    const adjustedY = Math.min(y, rect.height - padding);

    return { x: adjustedX, y: adjustedY };
  };

  const exportCanvasesToPDF = () => {
    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
    });

    // Get all initialized canvases
    const canvasIds = Array.from(initializedCanvases.current);

    if (canvasIds.length === 0) {
      alert("No canvases to export!");
      return;
    }

    // Process each canvas
    canvasIds.forEach((id, index) => {
      const canvas = canvasRefs.current[id];
      if (!canvas) return;

      // If not the first page, add a new page
      if (index > 0) {
        pdf.addPage();
      }

      // Create a temporary canvas with background color
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      // Set dimensions to match original canvas
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      // Fill with background color
      tempCtx.fillStyle = "#1F2937"; // Match your canvas background color
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the original canvas content on top
      tempCtx.drawImage(canvas, 0, 0);

      // Get the image data from the temporary canvas
      const imgData = tempCanvas.toDataURL("image/png");

      // Calculate dimensions to fit in PDF
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(
        pdfWidth / imgProps.width,
        pdfHeight / imgProps.height
      );
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      // Add canvas image to PDF
      pdf.addImage(imgData, "PNG", x, y, width, height);

      // Add canvas name as caption
      const canvasName =
        canvasesMetadata.find((cm) => cm.id === id)?.name || `Canvas ${id}`;
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255); // White text for better visibility on dark background
      pdf.text(canvasName, pdfWidth / 2, y + height + 20, { align: "center" });
    });

    // Save the PDF
    pdf.save("inscribe-workspace.pdf");
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvasId: number
  ): void => {
    if (canvasId !== activeCanvasId) return;

    if (selectedTool === "selection" && selectedArea) {
      clearSelection();
    }

    // Get the correct mouse position relative to the canvas
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (selectedTool === "textBox") {
      // Set the text input position
      setTextInputPosition({ x: mouseX, y: mouseY });
      setTextInputValue("");
      setActiveTextId(null);

      // Focus the text input
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 10);

      return;
    }

    if (selectedTool === "selection") {
      setIsSelecting(true);
      setSelectionStart({ x: mouseX, y: mouseY });

      // Save the original canvas state before drawing selection
      const canvas = canvasRefs.current[canvasId];
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          setOriginalCanvasState(
            ctx.getImageData(0, 0, canvas.width, canvas.height)
          );
        }
      }
      return;
    }

    if (selectedShape) {
      setIsDrawingShape(true);
      setShapeStartPosition({ x: mouseX, y: mouseY });

      // Create a temporary canvas for preview
      const tempCanvasElement = document.createElement("canvas");
      tempCanvasElement.width = canvas.width;
      tempCanvasElement.height = canvas.height;
      const tempCtx = tempCanvasElement.getContext("2d");

      if (tempCtx) {
        // Copy current canvas to temp canvas
        tempCtx.drawImage(canvas, 0, 0);
      }

      setTempCanvas(tempCanvasElement);
      return;
    }

    if (selectedTool === "pen" || selectedTool === "eraser") {
      setDrawing(true);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Reset points for perfect-freehand
        if (selectedTool === "pen") {
          (ctx as any).points = [[mouseX, mouseY]];
        }

        // Reset last position
        (ctx as any).lastX = mouseX;
        (ctx as any).lastY = mouseY;

        // Set up the context for drawing
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = penColor;
        ctx.fillStyle = penColor;

        if (selectedTool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
        } else {
          ctx.globalCompositeOperation = "source-over";
        }

        ctx.beginPath();
        ctx.moveTo(mouseX, mouseY);
      }
    }
  };

  const runRoute = async () => {
    try {
      setLoading(true);

      if (activeCanvasId === null) {
        console.error("No active canvas");
        setLoading(false);
        return;
      }

      const canvas = canvasRefs.current[activeCanvasId];
      if (!canvas) {
        console.error("Canvas reference not found");
        setLoading(false);
        return;
      }

      let imageData;

      if (selectedArea) {
        // Create a temporary canvas for the selected area
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = selectedArea.width;
        tempCanvas.height = selectedArea.height;
        const tempCtx = tempCanvas.getContext("2d");

        if (tempCtx) {
          // Copy only the selected area to the temporary canvas
          tempCtx.drawImage(
            canvas,
            selectedArea.x,
            selectedArea.y,
            selectedArea.width,
            selectedArea.height,
            0,
            0,
            selectedArea.width,
            selectedArea.height
          );

          // Get the image data from the temporary canvas
          imageData = tempCanvas.toDataURL("image/png");
        }
      } else {
        // If no selection, use the entire canvas
        imageData = canvas.toDataURL("image/png");
      }

      if (!imageData) {
        console.error("Failed to get image data");
        setLoading(false);
        return;
      }

      try {
        // Use the same API call as the old function
        const response = await axios.post(`http://localhost:8900/calculate`, {
          image: imageData,
          dict_of_vars: dictOfVars,
        });

        const resp = response.data;
        const newResults: GeneratedResult[] = [];

        // Process results (same as old function)
        resp.data.forEach((data: Response) => {
          if (data.assign) {
            setDictOfVars((prev) => ({ ...prev, [data.expr]: data.result }));
          }
          newResults.push({
            expression: data.expr,
            answer: data.result,
            position: { x: 0, y: 0 }, // Position not needed in sidebar
            steps: data.steps || "No steps available", // Include steps from response
          });
        });

        // Add to history (same as old function)
        const historyItem: SearchHistoryItem = {
          timestamp: new Date().toLocaleString(),
          results: newResults,
        };

        // Clear the selection after processing
        if (selectedArea) {
          clearSelection();
        }

        setSearchHistory((prev) => [historyItem, ...prev]);
        setCurrentResults(newResults);
        setIsResultsSidebarOpen(true);
      } catch (error) {
        console.error("API error:", error);
        alert("Error processing request");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert(
        "An unexpected error occurred. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    if (activeCanvasId === null) return;
    
    const canvas = canvasRefs.current[activeCanvasId];
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Get the current state from the undo stack
    const state = canvasStates.current[activeCanvasId];
    if (state && state.undoStack.length > 0) {
      const currentState = state.undoStack[state.undoStack.length - 1];
      ctx.putImageData(currentState, 0, 0);
    }
    
    // Clear the selection states
    setSelectedArea(null);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    // Create a new user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      isUser: true,
      timestamp: new Date(),
    };

    // Add user message to chat
    setChatMessages((prev) => [...prev, userMessage]);

    // Clear input
    setChatInput("");

    // Set loading state
    setIsChatLoading(true);

    try {
      // Send request to backend
      const response = await axios.post("http://localhost:8900/chat", {
        message: userMessage.text,
      });

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text:
          response.data.response || "Sorry, I couldn't process that request.",
        isUser: false,
        timestamp: new Date(),
      };

      // Add AI message to chat
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat API error:", error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, there was an error processing your request.",
        isUser: false,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const ResultItem = ({ result }: { result: GeneratedResult }) => {
    const [showSteps, setShowSteps] = useState(false);

    return (
      <div className="result-item">
        <div className="result-header">
          <div className="expression">
            <span className="label">Expression:</span> {result.expression}
          </div>
          <div className="answer">
            <span className="label">Answer:</span> {result.answer}
          </div>
          <button
            className="steps-toggle-btn"
            onClick={() => setShowSteps(!showSteps)}
          >
            {showSteps ? "Hide Steps" : "Show Steps"}
          </button>
        </div>

        {showSteps && result.steps && (
          <div className="steps-container">
            <h4>Solution Steps:</h4>
            <pre className="steps-content">{result.steps}</pre>
          </div>
        )}
      </div>
    );
  };

  const redrawTextElements = (canvasId: number) => {
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Only redraw active (non-deleted) text elements
    textElements.forEach((textElement) => {
      // Skip if the text has been deleted or is empty
      if (!textElement.text || textElement.deleted) return;

      // Set text properties
      ctx.font = `${textElement.isItalic ? "italic " : ""}${
        textElement.isBold ? "bold " : ""
      }${textElement.fontSize}px Arial`;
      ctx.fillStyle = textElement.color;
      ctx.textAlign = textElement.textAlign as CanvasTextAlign;
      ctx.textBaseline = "top";

      // Draw the text on canvas
      const lines = textElement.text.split("\n");
      const lineHeight = textElement.fontSize * 1.2;

      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          textElement.position.x,
          textElement.position.y + index * lineHeight
        );
      });
    });
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvasId: number
  ): void => {
    if (canvasId !== activeCanvasId) return;

    if (selectedTool === "textBox") {
      return;
    }

    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Relationship between CSS width and canvas width
    const scaleY = canvas.height / rect.height; // Relationship between CSS height and canvas height

    // Calculate the exact position with scaling factors
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (isSelecting && selectedTool === "selection") {
      if (!selectionStart) return;

      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx || !originalCanvasState) return;

      // Restore the original canvas state
      ctx.putImageData(originalCanvasState, 0, 0);

      // Calculate selection box dimensions
      const x = Math.min(selectionStart.x, mouseX);
      const y = Math.min(selectionStart.y, mouseY);
      const width = Math.abs(mouseX - selectionStart.x);
      const height = Math.abs(mouseY - selectionStart.y);

      // Update selection end
      setSelectionEnd({ x: mouseX, y: mouseY });

      // Draw selection box
      ctx.strokeStyle = "rgba(66, 133, 244, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      // Add a semi-transparent fill
      ctx.fillStyle = "rgba(66, 133, 244, 0.1)";
      ctx.fillRect(x, y, width, height);

      ctx.setLineDash([]);
      return;
    }
    if (
      selectedTool === "selection" &&
      selectedElement?.type === "image" &&
      draggedImageInfo?.selected
    ) {
      // We're in selection mode with a selected image
      const newX = mouseX - (draggedImageInfo.offsetX || 0);
      const newY = mouseY - (draggedImageInfo.offsetY || 0);

      // Get the canvas context
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Create a snapshot of the canvas state before starting to drag if we don't have one
      if (!draggedImageInfo.canvasSnapshot) {
        // Take a snapshot of the entire canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Create a temporary canvas to store the background
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        if (tempCtx) {
          // Draw the current state to the temp canvas
          tempCtx.putImageData(imageData, 0, 0);

          // Overwrite the image area with transparency
          tempCtx.globalCompositeOperation = "destination-out";
          tempCtx.fillRect(
            draggedImageInfo.x,
            draggedImageInfo.y,
            draggedImageInfo.width,
            draggedImageInfo.height
          );

          // Store this canvas state
          setDraggedImageInfo({
            ...draggedImageInfo,
            canvasSnapshot: tempCtx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ),
          });
        }
      }

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Restore the background without the image
      if (draggedImageInfo.canvasSnapshot) {
        ctx.putImageData(draggedImageInfo.canvasSnapshot, 0, 0);
      }

      // Draw the image at its new position
      ctx.drawImage(
        draggedImageInfo.img as HTMLImageElement,
        newX,
        newY,
        draggedImageInfo.width,
        draggedImageInfo.height
      );

      // Draw selection border around the image
      ctx.strokeStyle = "#0066ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        newX,
        newY,
        draggedImageInfo.width,
        draggedImageInfo.height
      );
      ctx.setLineDash([]);

      // Update the draggedImageInfo with the new position (but don't commit yet)
      setDraggedImageInfo({
        ...draggedImageInfo,
        tempX: newX,
        tempY: newY,
      });

      return;
    }

    if (isDragging && draggedImageInfo) {
      const newX = mouseX - (draggedImageInfo.offsetX || 0);
      const newY = mouseY - (draggedImageInfo.offsetY || 0);

      // Get the canvas context
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Create a snapshot of the canvas state before starting to drag if we don't have one
      if (!draggedImageInfo.canvasSnapshot) {
        // Take a snapshot of the entire canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Create a temporary canvas to store the background
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        if (tempCtx) {
          // Draw the current state to the temp canvas
          tempCtx.putImageData(imageData, 0, 0);

          // Overwrite the image area with transparency
          tempCtx.globalCompositeOperation = "copy"; // Overwrites destination
          tempCtx.fillStyle = "rgba(0, 0, 0, 0)"; // Transparent
          tempCtx.fillRect(
            draggedImageInfo.x,
            draggedImageInfo.y,
            draggedImageInfo.width,
            draggedImageInfo.height
          );

          // Reset composite mode
          tempCtx.globalCompositeOperation = "source-over";

          // Store the cleaned snapshot
          draggedImageInfo.canvasSnapshot = tempCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      }
      // Reset all drawing states to defaults
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]); // Reset any dashed lines

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Restore the background without the image
      if (draggedImageInfo.canvasSnapshot) {
        ctx.putImageData(draggedImageInfo.canvasSnapshot, 0, 0);
      }

      // Draw the image at its new position
      ctx.drawImage(
        draggedImageInfo.img as HTMLImageElement,
        newX,
        newY,
        draggedImageInfo.width,
        draggedImageInfo.height
      );

      // Update the draggedImageInfo with the new position
      setDraggedImageInfo({
        ...draggedImageInfo,
        x: newX,
        y: newY,
      });

      return;
    }

    if (isDrawingShape && shapeStartPosition && selectedShape) {
      const ctx = canvas.getContext("2d");
      if (!ctx || !tempCanvas) return;

      // Clear canvas and restore from temp canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);

      // Set drawing style
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.fillStyle = "transparent";

      // Draw the shape based on selection
      ctx.beginPath();

      switch (selectedShape) {
        case "rectangle":
          ctx.rect(
            shapeStartPosition.x,
            shapeStartPosition.y,
            mouseX - shapeStartPosition.x,
            mouseY - shapeStartPosition.y
          );
          break;

        case "circle":
          const radius = Math.sqrt(
            Math.pow(mouseX - shapeStartPosition.x, 2) +
              Math.pow(mouseY - shapeStartPosition.y, 2)
          );
          ctx.arc(
            shapeStartPosition.x,
            shapeStartPosition.y,
            radius,
            0,
            2 * Math.PI
          );
          break;

        case "line":
          ctx.moveTo(shapeStartPosition.x, shapeStartPosition.y);
          ctx.lineTo(mouseX, mouseY);
          break;

        case "arrow":
          // Draw the line
          ctx.moveTo(shapeStartPosition.x, shapeStartPosition.y);
          ctx.lineTo(mouseX, mouseY);

          // Calculate arrow head
          const angle = Math.atan2(
            mouseY - shapeStartPosition.y,
            mouseX - shapeStartPosition.x
          );
          const headLength = 15; // Length of arrow head

          // Draw the arrow head
          ctx.lineTo(
            mouseX - headLength * Math.cos(angle - Math.PI / 6),
            mouseY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(
            mouseX - headLength * Math.cos(angle + Math.PI / 6),
            mouseY - headLength * Math.sin(angle + Math.PI / 6)
          );
          break;

        case "triangle":
          ctx.moveTo(shapeStartPosition.x, shapeStartPosition.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.lineTo(
            shapeStartPosition.x - (mouseX - shapeStartPosition.x),
            mouseY
          );
          ctx.closePath();
          break;
      }

      ctx.stroke();
      return;
    }

    // Regular drawing if not dragging
    if (!drawing) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure our drawing settings are maintained
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (selectedTool === "pen") {
      // For pen tool, we'll collect points and use perfect-freehand later
      const lastX = (ctx as any).lastX || mouseX;
      const lastY = (ctx as any).lastY || mouseY;

      // Check if we're trying to draw over an image
      if (draggedImageInfo) {
        // Check if the current point is within the image bounds
        const isOverImage =
          mouseX >= draggedImageInfo.x &&
          mouseX <= draggedImageInfo.x + draggedImageInfo.width &&
          mouseY >= draggedImageInfo.y &&
          mouseY <= draggedImageInfo.y + draggedImageInfo.height;

        // Skip drawing if over an image
        if (isOverImage) {
          return;
        }
      }

      // Store the current point
      if (!(ctx as any).points) {
        (ctx as any).points = [];
      }
      (ctx as any).points.push([mouseX, mouseY]);

      // Draw with perfect-freehand
      const stroke = getStroke((ctx as any).points, {
        size: penSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });

      // Convert to SVG path and draw
      const pathData = getSvgPathFromStroke(stroke);

      ctx.fillStyle = penColor;
      ctx.fill(new Path2D(pathData));
    } else if (selectedTool === "eraser") {
      // Eraser can use the original implementation
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalCompositeOperation = "destination-out";

      const lastX = (ctx as any).lastX || mouseX;
      const lastY = (ctx as any).lastY || mouseY;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);

      const midX = (lastX + mouseX) / 2;
      const midY = (lastY + mouseY) / 2;
      ctx.quadraticCurveTo(lastX, lastY, midX, midY);

      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();
    }

    // Store current position for next draw call
    (ctx as any).lastX = mouseX;
    (ctx as any).lastY = mouseY;
  };

  const stopDrawing = (canvasId: number): void => {
    if (canvasId !== activeCanvasId) return;

    if (isSelecting && selectedTool === "selection") {
      setIsSelecting(false);

      // If selection is too small, consider it a click
      if (selectionStart && selectionEnd) {
        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        const width = Math.abs(selectionEnd.x - selectionStart.x);
        const height = Math.abs(selectionEnd.y - selectionStart.y);

        // Only set selectedArea if the selection has a meaningful size
        if (width > 5 && height > 5) {
          // Store the selection area for AI search
          setSelectedArea({ x, y, width, height });
          
          // Draw the selection box immediately
          const canvas = canvasRefs.current[canvasId];
          if (canvas && originalCanvasState) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              // First, restore the original canvas state without any selection boxes
              ctx.putImageData(originalCanvasState, 0, 0);
              
              // Draw the selection box with a semi-transparent fill
              ctx.fillStyle = 'rgba(66, 133, 244, 0.1)';
              ctx.fillRect(x, y, width, height);
              
              // Draw a dashed border
              ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.strokeRect(x, y, width, height);
              ctx.setLineDash([]);
            }
          }
        } else {
          // This is a click, not a selection
          clearSelection();
          const minSelectionSize = 5;
          if (
            Math.abs(selectionEnd.x - selectionStart.x) < minSelectionSize &&
            Math.abs(selectionEnd.y - selectionStart.y) < minSelectionSize
          ) {
            // Check for text at click point
            const clickPoint = {
              x: selectionStart.x,
              y: selectionStart.y,
              width: 1,
              height: 1,
            };

            // Find clicked text element that is still active (not deleted)
            const clickedText = textElements.find((text) => {
              // Skip checking if the text has been deleted
              if (!text.text || text.deleted) return false;

              const canvas = canvasRefs.current[canvasId];
              if (!canvas) return false;

              const ctx = canvas.getContext("2d");
              if (!ctx) return false;

              ctx.font = `${text.fontSize}px Arial`;
              const textWidth = ctx.measureText(text.text).width;
              const textHeight = text.fontSize * 1.2;

              return (
                clickPoint.x >= text.position.x &&
                clickPoint.x <= text.position.x + textWidth &&
                clickPoint.y >= text.position.y &&
                clickPoint.y <= text.position.y + textHeight
              );
            });

            if (clickedText) {
              // Set up text editing
              setTextInputPosition(clickedText.position);
              setTextInputValue(clickedText.text);
              setActiveTextId(clickedText.id);

              // Focus the text input after a short delay to ensure it's rendered
              setTimeout(() => {
                if (textInputRef.current) {
                  textInputRef.current.focus();

                  // Set styling
                  textInputRef.current.style.fontWeight = clickedText.isBold
                    ? "bold"
                    : "normal";
                  textInputRef.current.style.fontStyle = clickedText.isItalic
                    ? "italic"
                    : "normal";
                  textInputRef.current.style.textDecoration =
                    clickedText.isUnderlined ? "underline" : "none";
                  textInputRef.current.style.textAlign = clickedText.textAlign;
                  textInputRef.current.style.fontSize = `${clickedText.fontSize}px`;
                  textInputRef.current.style.color = clickedText.color;
                }
              }, 10);
            }
            if (!clickedText && draggedImageInfo) {
              // Check if click is within image bounds
              const isClickOnImage =
                selectionStart.x >= draggedImageInfo.x &&
                selectionStart.x <=
                  draggedImageInfo.x + draggedImageInfo.width &&
                selectionStart.y >= draggedImageInfo.y &&
                selectionStart.y <=
                  draggedImageInfo.y + draggedImageInfo.height;

              if (isClickOnImage) {
                // Set the selected element to this image
                setSelectedElement({
                  type: "image",
                  element: draggedImageInfo,
                });

                // Calculate offset for dragging
                const offsetX = selectionStart.x - draggedImageInfo.x;
                const offsetY = selectionStart.y - draggedImageInfo.y;

                // Update draggedImageInfo with offset
                setDraggedImageInfo({
                  ...draggedImageInfo,
                  offsetX,
                  offsetY,
                  selected: true,
                });
              } else {
                // Clicked elsewhere, deselect
                setSelectedElement(null);
                if (draggedImageInfo) {
                  setDraggedImageInfo({
                    ...draggedImageInfo,
                    selected: false,
                  });
                }
              }
            }
          } else {
            // This is a selection area, not just a click
            // Store the selection area for AI search
            const selectionRect = {
              x: Math.min(selectionStart.x, selectionEnd.x),
              y: Math.min(selectionStart.y, selectionEnd.y),
              width: Math.abs(selectionEnd.x - selectionStart.x),
              height: Math.abs(selectionEnd.y - selectionStart.y),
            };

            setSelectedArea(selectionRect);

            // Check if any images are within the selection area
            if (draggedImageInfo) {
              // Check if image is within selection
              const isImageInSelection =
                draggedImageInfo.x < selectionRect.x + selectionRect.width &&
                draggedImageInfo.x + draggedImageInfo.width > selectionRect.x &&
                draggedImageInfo.y < selectionRect.y + selectionRect.height &&
                draggedImageInfo.y + draggedImageInfo.height > selectionRect.y;

              if (isImageInSelection) {
                // Set the selected element to this image
                setSelectedElement({
                  type: "image",
                  element: draggedImageInfo,
                });

                // Update draggedImageInfo
                setDraggedImageInfo({
                  ...draggedImageInfo,
                  selected: true,
                  // Set offset to center of image for dragging from selection
                  offsetX: draggedImageInfo.width / 2,
                  offsetY: draggedImageInfo.height / 2,
                });
              }
            }
          }
        }
      }

      // Clear selection box regardless of whether text was found
      setSelectionStart(null);
      setSelectionEnd(null);
      setTextSelectionBox(null);
      setShowTextSelectionBox(false);

      // Restore original canvas state without selection box
      const canvas = canvasRefs.current[canvasId];
      if (canvas && originalCanvasState) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(originalCanvasState, 0, 0);

          // If we have a selected area, draw a semi-transparent highlight over it
          if (selectedArea) {
            ctx.fillStyle = "rgba(66, 133, 244, 0.2)";
            ctx.fillRect(
              selectedArea.x,
              selectedArea.y,
              selectedArea.width,
              selectedArea.height
            );

            // Draw a border around the selected area
            ctx.strokeStyle = "rgba(66, 133, 244, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              selectedArea.x,
              selectedArea.y,
              selectedArea.width,
              selectedArea.height
            );
            ctx.setLineDash([]);
          }
        }
      }
      setOriginalCanvasState(null);
    }

    if (
      selectedElement?.type === "image" &&
      draggedImageInfo?.selected &&
      draggedImageInfo.tempX !== undefined &&
      draggedImageInfo.tempY !== undefined
    ) {
      // Commit the new position
      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save the current state to undo stack
      const state = canvasStates.current[canvasId];
      if (state) {
        state.undoStack.push(
          ctx.getImageData(0, 0, canvas.width, canvas.height)
        );
        state.redoStack = [];
      }

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Restore the background without the image
      if (draggedImageInfo.canvasSnapshot) {
        ctx.putImageData(draggedImageInfo.canvasSnapshot, 0, 0);
      }

      // Draw the image at its final position without selection border
      ctx.drawImage(
        draggedImageInfo.img as HTMLImageElement,
        draggedImageInfo.tempX,
        draggedImageInfo.tempY,
        draggedImageInfo.width,
        draggedImageInfo.height
      );

      // Update the draggedImageInfo with the new position
      setDraggedImageInfo({
        ...draggedImageInfo,
        x: draggedImageInfo.tempX,
        y: draggedImageInfo.tempY,
        tempX: undefined,
        tempY: undefined,
        canvasSnapshot: null, // Clear the snapshot
        selected: false, // Deselect the image after positioning
      });

      // Deselect the element
      setSelectedElement(null);

      // Save to localStorage
      if (activeCanvasId !== null) {
        saveCanvasToLocalStorage(activeCanvasId, canvas);
      }
    }
    // Handle finishing image drag
    if (isDragging && draggedImageInfo) {
      setIsDragging(false);

      // Clear the snapshot to free memory
      setDraggedImageInfo({
        ...draggedImageInfo,
        canvasSnapshot: undefined,
      });

      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save the current state after dragging
      const state = canvasStates.current[canvasId];
      if (state) {
        // Push the current state to the undo stack
        state.undoStack.push(
          ctx.getImageData(0, 0, canvas.width, canvas.height)
        );
        state.redoStack = [];

        // Save after dragging
        saveCanvasToLocalStorage(canvasId, canvas);
      }

      return;
    }

    if (isDrawingShape && selectedShape) {
      setIsDrawingShape(false);
      setShapeStartPosition(null);
      setTempCanvas(null);

      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save the current state after drawing the shape
      const state = canvasStates.current[canvasId];
      if (state) {
        state.undoStack.push(
          ctx.getImageData(0, 0, canvas.width, canvas.height)
        );
        state.redoStack = [];

        // Save to localStorage after drawing is complete
        saveCanvasToLocalStorage(canvasId, canvas);
      }

      return;
    }

    // Regular drawing completion
    if (!drawing) return;

    setDrawing(false);

    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For pen tool, finalize the perfect-freehand stroke
    if (selectedTool === "pen" && (ctx as any).points) {
      // The final stroke is already drawn in the draw function
      // Just clean up the points
      delete (ctx as any).points;
    }

    // Reset the last position
    delete (ctx as any).lastX;
    delete (ctx as any).lastY;

    ctx.closePath();

    // Save the current state after drawing
    const state = canvasStates.current[canvasId];
    if (state) {
      state.undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      state.redoStack = [];

      // Limit stack size to prevent localStorage overflow
      if (state.undoStack.length > 10) {
        state.undoStack.splice(1, state.undoStack.length - 10);
      }

      // Save to localStorage after drawing is complete
      saveCanvasToLocalStorage(canvasId, canvas);
    }
  };


  const drawSelectionBox = () => {
    if (activeCanvasId === null || !selectedArea) return;
    
    const canvas = canvasRefs.current[activeCanvasId];
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Get the current state from the undo stack
    const state = canvasStates.current[activeCanvasId];
    if (state && state.undoStack.length > 0) {
      // First restore the clean canvas state without selection
      const currentState = state.undoStack[state.undoStack.length - 1];
      ctx.putImageData(currentState, 0, 0);
      
      // Now draw the selection box
      ctx.fillStyle = 'rgba(66, 133, 244, 0.1)';
      ctx.fillRect(
        selectedArea.x, 
        selectedArea.y, 
        selectedArea.width, 
        selectedArea.height
      );
      
      // Draw a border around the selected area
      ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectedArea.x, 
        selectedArea.y, 
        selectedArea.width, 
        selectedArea.height
      );
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    if (selectedArea) {
      drawSelectionBox();
    }
  }, [selectedArea, activeCanvasId]);

  const drawTextSelectionBox = (
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    // Save current context state
    ctx.save();

    // Draw blue selection rectangle
    ctx.strokeStyle = "#1a73e8";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(box.x - 4, box.y - 4, box.width + 8, box.height + 8);

    // Draw selection handles (small blue squares)
    ctx.fillStyle = "#1a73e8";

    // Top-left handle
    ctx.fillRect(box.x - 6, box.y - 6, 8, 8);

    // Top-right handle
    ctx.fillRect(box.x + box.width - 2, box.y - 6, 8, 8);

    // Bottom-left handle
    ctx.fillRect(box.x - 6, box.y + box.height - 2, 8, 8);

    // Bottom-right handle
    ctx.fillRect(box.x + box.width - 2, box.y + box.height - 2, 8, 8);

    // Restore context state
    ctx.restore();
  };

  useEffect(() => {
    if (activeCanvasId !== null && showTextSelectionBox && textSelectionBox) {
      const canvas = canvasRefs.current[activeCanvasId];
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Redraw the canvas from the last state
          const state = canvasStates.current[activeCanvasId];
          if (state && state.undoStack.length > 0) {
            const lastState = state.undoStack[state.undoStack.length - 1];
            ctx.putImageData(lastState, 0, 0);

            // Draw the selection box
            drawTextSelectionBox(ctx, textSelectionBox);
          }
        }
      }
    }
  }, [activeCanvasId, showTextSelectionBox, textSelectionBox]);

  useEffect(() => {
    const savedTextElements = localStorage.getItem("canvasTextElements");
    if (savedTextElements) {
      try {
        setTextElements(JSON.parse(savedTextElements));
      } catch (e) {
        console.error("Error loading text elements:", e);
      }
    }
  }, []);

  const handleTextConfirm = (): void => {
    if (!textInputPosition || !textInputValue.trim()) {
      setTextInputPosition(null);
      setTextInputValue("");
      setActiveTextId(null);
      setShowTextSelectionBox(false);
      setTextSelectionBox(null);
      return;
    }

    const canvas =
      activeCanvasId !== null ? canvasRefs.current[activeCanvasId] : null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current state before adding/editing text
    const state =
      activeCanvasId !== null ? canvasStates.current[activeCanvasId] : null;
    if (state) {
      state.undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      state.redoStack = [];
    }

    // Get styling from the textarea
    const textarea = textInputRef.current;
    if (!textarea) return;

    const isBold = textarea.style.fontWeight === "bold";
    const isItalic = textarea.style.fontStyle === "italic";
    const isUnderlined = textarea.style.textDecoration === "underline";
    const textAlign = textarea.style.textAlign || "left";

    // If editing existing text, first remove it from the canvas
    if (activeTextId) {
      // Find the text element
      const textElement = textElements.find((el) => el.id === activeTextId);

      if (textElement) {
        // Clear the area where the old text was
        // First, measure the text dimensions
        ctx.font = `${textElement.isBold ? "bold " : ""}${
          textElement.isItalic ? "italic " : ""
        }${textElement.fontSize}px Arial`;

        const lines = textElement.text.split("\n");
        const lineHeight = textElement.fontSize * 1.2;
        let maxWidth = 0;

        // Find the maximum width of all lines
        lines.forEach((line) => {
          const metrics = ctx.measureText(line);
          maxWidth = Math.max(maxWidth, metrics.width);
        });

        // Clear the area with a small padding
        const padding = 5;
        ctx.clearRect(
          textElement.position.x - padding,
          textElement.position.y - padding,
          maxWidth + padding * 2,
          lineHeight * lines.length + padding * 2
        );
      }
    }

    // Set text properties for new text
    ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${
      penSize * 2
    }px Arial`;
    ctx.fillStyle = penColor;
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = "top";

    // Draw the text on canvas
    const lines = textInputValue.split("\n");
    const lineHeight = penSize * 2 * 1.2;

    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        textInputPosition.x,
        textInputPosition.y + index * lineHeight
      );
    });

    // Update textElements state
    if (activeTextId) {
      setTextElements((prev) =>
        prev.map((el) =>
          el.id === activeTextId
            ? {
                ...el,
                text: textInputValue,
                isBold,
                isItalic,
                isUnderlined,
                textAlign,
                color: penColor,
                fontSize: penSize * 2,
              }
            : el
        )
      );
    } else {
      // Add new text element
      const newTextElement: TextElement = {
        id: Date.now().toString(),
        text: textInputValue,
        position: textInputPosition,
        fontSize: penSize * 2,
        color: penColor,
        isBold,
        isItalic,
        isUnderlined,
        textAlign,
      };
      setTextElements((prev) => [...prev, newTextElement]);
    }

    // Save to localStorage
    localStorage.setItem(
      "canvasTextElements",
      JSON.stringify(
        activeTextId
          ? textElements.map((el) =>
              el.id === activeTextId
                ? {
                    ...el,
                    text: textInputValue,
                    isBold,
                    isItalic,
                    isUnderlined,
                    textAlign,
                    color: penColor,
                    fontSize: penSize * 2,
                  }
                : el
            )
          : [
              ...textElements,
              {
                id: Date.now().toString(),
                text: textInputValue,
                position: textInputPosition,
                fontSize: penSize * 2,
                color: penColor,
                isBold,
                isItalic,
                isUnderlined,
                textAlign,
              },
            ]
      )
    );

    // Save to localStorage after adding/editing text
    if (activeCanvasId !== null) {
      saveCanvasToLocalStorage(activeCanvasId, canvas);
    }

    // Reset text input and selection
    setTextInputPosition(null);
    setTextInputValue("");
    setActiveTextId(null);
    setShowTextSelectionBox(false);
    setTextSelectionBox(null);

    // Clear any selection state
    setSelectionStart(null);
    setSelectionEnd(null);
    setOriginalCanvasState(null);
  };

  const parseFormattedText = (text: string) => {
    // Create a structure to track formatting
    const segments = [];

    // Process the text character by character to handle overlapping formats
    let currentText = "";
    let isBold = false;
    let isItalic = false;
    let isUnderlined = false;
    let i = 0;

    while (i < text.length) {
      // Check for bold marker
      if (i + 1 < text.length && text[i] === "*" && text[i + 1] === "*") {
        // Add current segment if there's any text
        if (currentText) {
          segments.push({
            text: currentText,
            isBold,
            isItalic,
            isUnderlined,
          });
          currentText = "";
        }

        // Toggle bold state
        isBold = !isBold;
        i += 2; // Skip the ** marker
        continue;
      }

      // Check for italic marker
      if (text[i] === "_") {
        // Add current segment if there's any text
        if (currentText) {
          segments.push({
            text: currentText,
            isBold,
            isItalic,
            isUnderlined,
          });
          currentText = "";
        }

        // Toggle italic state
        isItalic = !isItalic;
        i += 1; // Skip the _ marker
        continue;
      }

      // Check for underline marker
      if (text[i] === "~") {
        // Add current segment if there's any text
        if (currentText) {
          segments.push({
            text: currentText,
            isBold,
            isItalic,
            isUnderlined,
          });
          currentText = "";
        }

        // Toggle underline state
        isUnderlined = !isUnderlined;
        i += 1; // Skip the ~ marker
        continue;
      }

      // Add character to current text
      currentText += text[i];
      i++;
    }

    // Add the final segment if there's any text left
    if (currentText) {
      segments.push({
        text: currentText,
        isBold,
        isItalic,
        isUnderlined,
      });
    }

    return segments;
  };

  // Add a function to render text boxes on canvas
  const renderTextBoxesToCanvas = (canvasId: number) => {
    if (canvasId !== activeCanvasId) return;

    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw canvas from saved state first
    // Then draw all text boxes
    textBoxes.forEach((box) => {
      ctx.font = `${box.fontSize}px Arial`;
      ctx.fillStyle = box.color;
      ctx.textBaseline = "top";

      // Split text into lines and draw
      const lines = box.text.split("\n");
      const lineHeight = box.fontSize * 1.2;

      lines.forEach((line, index) => {
        ctx.fillText(line, box.position.x, box.position.y + index * lineHeight);
      });
    });

    // Save canvas state after drawing all text boxes
    const state = canvasStates.current[canvasId];
    if (state) {
      state.undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      state.redoStack = [];
      saveCanvasToLocalStorage(canvasId, canvas);
    }
  };

  const undo = (): void => {
    if (activeCanvasId === null) return;

    const state = canvasStates.current[activeCanvasId];
    if (!state || state.undoStack.length <= 1) return;

    const canvas = canvasRefs.current[activeCanvasId];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Remove the current state and add it to redo stack
    const currentState = state.undoStack.pop();
    if (currentState) {
      state.redoStack.push(currentState);
    }

    // Apply the previous state
    if (state.undoStack.length > 0) {
      const previousState = state.undoStack[state.undoStack.length - 1];
      ctx.putImageData(previousState, 0, 0);
    } else {
      // If no previous state, clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Save after undo
    saveCanvasToLocalStorage(activeCanvasId, canvas);
  };

  const redo = (): void => {
    if (activeCanvasId === null) return;

    const state = canvasStates.current[activeCanvasId];
    if (!state || state.redoStack.length === 0) return;

    const canvas = canvasRefs.current[activeCanvasId];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get the next state from the redo stack
    const nextState = state.redoStack.pop();
    if (nextState) {
      // Add it to the undo stack and apply it
      state.undoStack.push(nextState);
      ctx.putImageData(nextState, 0, 0);

      // Save after redo
      saveCanvasToLocalStorage(activeCanvasId, canvas);
    }
  };

  const resetCanvas = (): void => {
    if (activeCanvasId === null) return;

    const canvas = canvasRefs.current[activeCanvasId];
    setResult((prev) =>
      prev.filter(
        (res) =>
          !(
            res.position.x >= 0 &&
            res.position.x <= window.innerWidth &&
            res.position.y >= 0 &&
            res.position.y <= window.innerHeight
          )
      )
    );
    setLatexExpression([]);
    setDictOfVars({});
    // Clear the dragged image info when resetting canvas
    setDraggedImageInfo(null);
    setSelectedElement(null);

    // Mark text elements on this canvas as deleted instead of removing them
    setTextElements((prev) =>
      prev.map((el) => {
        // Check if this text element is on the current canvas
        if (activeCanvasId !== null) {
          return { ...el, deleted: true };
        }
        return el;
      })
    );

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = canvasStates.current[activeCanvasId];
    if (state) {
      state.undoStack = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      state.redoStack = [];
      saveCanvasToLocalStorage(activeCanvasId, canvas);
    }
  };

  const resetAllCanvases = (): void => {
    // Reset all initialized canvases
    initializedCanvases.current.forEach((id) => {
      const canvas = canvasRefs.current[id];
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Reset the canvas state
          const state = canvasStates.current[id];
          if (state) {
            state.undoStack = [
              ctx.getImageData(0, 0, canvas.width, canvas.height),
            ];
            state.redoStack = [];
            saveCanvasToLocalStorage(id, canvas);
          }
        }
      }
    });
    // Clear results and variables
    setResult([]);
    setLatexExpression([]);
    setDictOfVars({});
    // Clear the dragged image info when resetting all canvases
    setDraggedImageInfo(null);
    setSelectedElement(null);
  };

  const importImage = (): void => {
    if (activeCanvasId === null) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = canvasRefs.current[activeCanvasId as number];
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Calculate scale factor to fit within canvas while maintaining aspect ratio
          const maxWidth = canvas.width * 0.8; // Use 80% of canvas width
          const maxHeight = canvas.height * 0.8; // Use 80% of canvas height

          let scaleFactor = 1;
          if (img.width > maxWidth || img.height > maxHeight) {
            const widthRatio = maxWidth / img.width;
            const heightRatio = maxHeight / img.height;
            scaleFactor = Math.min(widthRatio, heightRatio);
          }

          const imgWidth = img.width * scaleFactor;
          const imgHeight = img.height * scaleFactor;
          const centerX = (canvas.width - imgWidth) / 2;
          const centerY = (canvas.height - imgHeight) / 2;

          // Store the image info for dragging
          setDraggedImageInfo({
            img: img,
            x: centerX,
            y: centerY,
            width: imgWidth,
            height: imgHeight,
            offsetX: 0,
            offsetY: 0,
          });

          // Clear canvas and draw the image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, centerX, centerY, imgWidth, imgHeight);

          // Save this state in the undo stack
          const state = canvasStates.current[activeCanvasId as number];
          if (state) {
            state.undoStack = [
              ctx.getImageData(0, 0, canvas.width, canvas.height),
            ];
            state.redoStack = [];

            // Save after import
            saveCanvasToLocalStorage(activeCanvasId as number, canvas);
          }
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveAllCanvases = (): void => {
    initializedCanvases.current.forEach((id) => {
      const canvas = canvasRefs.current[id];
      if (canvas) {
        saveCanvasToLocalStorage(id, canvas);
      }
    });
    alert("All canvases saved successfully!");
  };

  const handleToolSelect = (
    tool: "pen" | "eraser" | "textBox" | "selection"
  ): void => {
    // First commit any active text input before switching tools
    if (textInputPosition && textInputValue.trim()) {
      handleTextConfirm();
    }

    // Clear text selection when switching away from selection tool
    if (tool !== "selection") {
      setSelectedTextId(null);
      setShowTextSelectionBox(false);
      setTextSelectionBox(null);

      // Clear any active area selection
      if (selectedArea && activeCanvasId !== null) {
        clearSelection();
      }
    }

    // Reset selection states when switching tools
    setSelectionStart(null);
    setSelectionEnd(null);
    setOriginalCanvasState(null);
    setIsSelecting(false);

    setSelectedTool(tool);

    // When switching to pen, keep the current shape if it exists
    // When switching to other tools, reset the shape selection
    if (tool !== "pen") {
      setSelectedShape(null);
    }

    // Clear any selected element when switching tools
    if (tool !== "selection") {
      setSelectedElement(null);
    }
  };

  const handleCanvasSelect = (canvasId: number): void => {
    setActiveCanvasId(canvasId);
  };

  const deleteCanvas = (canvasId: number): void => {
    // Remove from localStorage first
    localStorage.removeItem(`canvas_${canvasId}`);

    setCanvasesMetadata((prev) =>
      prev.filter((canvas) => canvas.id !== canvasId)
    );

    // Clean up the canvas state
    delete canvasStates.current[canvasId];
    initializedCanvases.current.delete(canvasId);

    // If we deleted the active canvas, select another one
    if (activeCanvasId === canvasId) {
      const remainingCanvases = canvasesMetadata.filter(
        (canvas) => canvas.id !== canvasId
      );
      if (remainingCanvases.length > 0) {
        setActiveCanvasId(remainingCanvases[0].id);
      } else {
        setActiveCanvasId(null);
        // Create a new canvas if none left
        createNewCanvas();
      }
    }
  };

  function addCanvas(event: React.MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();

    // Save current canvas before creating a new one
    if (activeCanvasId !== null) {
      const canvas = canvasRefs.current[activeCanvasId];
      if (canvas) {
        saveCanvasToLocalStorage(activeCanvasId, canvas);
      }
    }

    createNewCanvas();
  }

  // Format chat message to handle markdown-style formatting
  const formatChatMessage = (text: string) => {
    if (!text) return null;

    // Split by double newlines to handle paragraphs
    const paragraphs = text.split(/\n\n+/);

    return (
      <>
        {paragraphs.map((paragraph, pIndex) => {
          // Check if paragraph starts with a bullet point
          const hasBullet = paragraph.trim().startsWith("*");
          const paragraphContent = hasBullet
            ? paragraph.trim().substring(1).trim()
            : paragraph;

          return (
            <Fragment key={`para-${pIndex}`}>
              {pIndex > 0 && <div className="mt-4"></div>}
              <div>
                {hasBullet && <span>• </span>}
                {/* Process bold text in paragraph */}
                {processTextForBold(paragraphContent)}
              </div>
            </Fragment>
          );
        })}
      </>
    );
  };

  // Helper function to process bold text
  const processTextForBold = (text: string) => {
    const boldPattern = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    const elements = [];
    let match;

    while ((match = boldPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add the bold text
      elements.push(
        <span key={`bold-${match.index}`} className="font-bold">
          {match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>
      );
    }

    // If no bold patterns were found, just return the text
    if (elements.length === 0) {
      elements.push(<span>{text}</span>);
    }

    return elements;
  };

  const ResultItemWithSteps = ({ result }: { result: GeneratedResult }) => {
    const [showSteps, setShowSteps] = useState(false);

    // Ensure we're working with strings before using replace
    const formattedQuestion = String(result.expression).replace(
      /([a-zA-Z])([A-Z])/g,
      "$1 $2"
    );
    const formattedAnswer = String(result.answer).replace(
      /([a-zA-Z])([A-Z])/g,
      "$1 $2"
    );

    return (
      <div className="latex-result mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
        <div className="space-y-3">
          <div className="text-blue-400 font-medium text-sm">Question:</div>
          <div
            className="text-gray-200 text-xs"
            dangerouslySetInnerHTML={{
              __html: `\\(\\large{\\text{${formattedQuestion}}}\\)`,
            }}
          />

          <div className="text-green-400 font-medium text-sm mt-4">
            Solution:
          </div>
          <div
            className="text-gray-200 text-sm p-2"
            style={{
              maxWidth: "100%",
              wordBreak: "break-word",
              whiteSpace: "normal",
              lineHeight: "1.5",
            }}
          >
            {formattedAnswer}
          </div>

          {/* Add steps toggle button */}
          {result.steps && (
            <>
              <button
                className="text-gray-300 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded mt-2"
                onClick={() => setShowSteps(!showSteps)}
              >
                {showSteps ? "Hide Steps" : "Show Steps"}
              </button>

              {/* Show steps when toggle is on */}
              {showSteps && (
                <div className="mt-3">
                  <div className="text-yellow-400 font-medium text-sm">
                    Steps:
                  </div>
                  <pre
                    className="text-gray-200 text-xs p-2 bg-gray-900 rounded border border-gray-700 mt-2 overflow-x-auto"
                    style={{
                      maxWidth: "100%",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.5",
                      fontFamily: "monospace",
                    }}
                  >
                    {result.steps}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Update the resize handler to properly scale content
  useEffect(() => {
    const handleResize = () => {
      Object.entries(canvasRefs.current).forEach(([id, canvas]) => {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Create temporary canvas to preserve content
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            if (!tempCtx) return;

            // Store current dimensions and content
            const oldWidth = canvas.width;
            const oldHeight = canvas.height;
            tempCanvas.width = oldWidth;
            tempCanvas.height = oldHeight;
            tempCtx.putImageData(
              ctx.getImageData(0, 0, oldWidth, oldHeight),
              0,
              0
            );

            // Resize main canvas
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight - 60;

            // Scale and redraw content
            ctx.drawImage(
              tempCanvas,
              0,
              0,
              oldWidth,
              oldHeight,
              0,
              0,
              canvas.width,
              canvas.height
            );
          }
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Save results to localStorage whenever they change
    localStorage.setItem("canvasResults", JSON.stringify(result));
  }, [result]);

  useEffect(() => {
    // Load results from localStorage on component mount
    const savedResults = localStorage.getItem("canvasResults");
    if (savedResults) {
      setResult(JSON.parse(savedResults));
    }
  }, []);
  // Add these event handlers to handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing && activeTextBox && resizeHandle) {
        e.preventDefault();

        setTextBoxes((prev) =>
          prev.map((box) => {
            if (box.id !== activeTextBox) return box;

            const rect = textInputRef.current?.getBoundingClientRect();
            if (!rect) return box;

            let newWidth = box.width;
            let newHeight = box.height;
            let newX = box.position.x;
            let newY = box.position.y;

            // Handle resizing based on which handle is being dragged
            if (resizeHandle.includes("e")) {
              newWidth = Math.max(100, e.clientX - rect.left + 10);
            }
            if (resizeHandle.includes("w")) {
              const diff = rect.left - e.clientX;
              newWidth = Math.max(100, rect.width + diff);
              newX = box.position.x - diff;
            }
            if (resizeHandle.includes("s")) {
              newHeight = Math.max(30, e.clientY - rect.top + 10);
            }
            if (resizeHandle.includes("n")) {
              const diff = rect.top - e.clientY;
              newHeight = Math.max(30, rect.height + diff);
              newY = box.position.y - diff;
            }

            return {
              ...box,
              width: newWidth,
              height: newHeight,
              position: { x: newX, y: newY },
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      if (resizing) {
        setResizing(false);
        setResizeHandle(null);

        // Render text boxes to canvas after resize is complete
        if (activeCanvasId !== null) {
          renderTextBoxesToCanvas(activeCanvasId);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, activeTextBox, resizeHandle, activeCanvasId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only apply shortcuts when not typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "1": // Pen tool
          handleToolSelect("pen");
          setSelectedShape(null);
          break;
        case "2": // Eraser tool
          handleToolSelect("selection");
          break;
        case "3": // Eraser tool
          handleToolSelect("eraser");
          break;
        case "4": // Text box tool
          handleToolSelect("textBox");
          break;
        case "5": // Shapes dropdown
          setShowShapesDropdown(!showShapesDropdown);
          break;
        case "z": // Undo when Ctrl is pressed
          if (e.ctrlKey) {
            e.preventDefault();
            undo();
          }
          break;
        case "y": // Redo when Ctrl is pressed
          if (e.ctrlKey) {
            e.preventDefault();
            redo();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShapesDropdown]);

  return (
    <div className="relative">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gray-800 z-50 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0"
        } overflow-x-hidden`}
      >
        <div className="p-4">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-white text-2xl absolute right-4 top-4"
          >
            &times;
          </button>
          {isSidebarOpen && (
            <span>
              <button onClick={handleInscribeBtn}>
                <img
                  src={ButtonImages.inscribeImg}
                  className="w-50 h-10  absolute left-12 top-5 md:right-22 md:left-auto"
                />
              </button>
            </span>
          )}

          <div className="mt-12 space-y-4">
            {/* File Operations */}

            <button
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
              onClick={importImage}
            >
              <img src={ButtonImages.importBtn} className="w-5 h-5 ml-2" />
              <span>Import Image</span>
            </button>

            <button
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
              onClick={exportCanvasesToPDF}
            >
              <img src={ButtonImages.exportBtn} className="w-5 h-5 ml-2" />
              <span>Export as PDF</span>
            </button>

            <button
              onClick={resetAllCanvases}
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
              title="Reset All Canvases"
            >
              <img src={ButtonImages.deleteBtn} className="w-5 h-5 ml-2" />
              <span>Reset all canvases</span>
            </button>

            <button
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
              onClick={saveAllCanvases}
            >
              <img src={ButtonImages.saveBtn} className="w-5 h-5 ml-2" />
              <span>Save All</span>
            </button>

            {/* <button
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
              onClick={handleDashboard}
            >
              <img src={ButtonImages.saveBtn} className="w-5 h-5 ml-2" />
              <span>Dashboard</span>
            </button> */}

            <div className="border-t border-gray-600 my-2"></div>

            {/* Social Section */}
            <div className="px-2 py-1 text-gray-400 text-sm">Follow Us</div>

            <a
              href="https://github.com/asliAdarsh"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              <img src={ButtonImages.gitBtn} className="w-5 h-5 ml-2" />
              <span>GitHub</span>
            </a>
            <a
              href="https://x.com/alsiAdarsh"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              <img src={ButtonImages.xBtn} className="w-5 h-5 ml-2" />
              <span>Twitter</span>
            </a>
            <a
              href=""
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              <img src={ButtonImages.discrodBtn} className="w-5 h-5 ml-2" />
              <span>Discord</span>
            </a>
            <a
              href="https://www.linkedin.com/in/adarsh-jaiswal-935403327/"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
            >
              <img src={ButtonImages.linkedinBtn} className="w-5 h-5 ml-2" />
              <span>Linkedin</span>
            </a>
            <div className="border-t border-gray-600 my-2"></div>
            <div className="login-logout-container">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
                >
                  <img src={ButtonImages.logOutBtn} className="w-5 h-5 ml-2" />
                  <span>Sign Up</span>
                </button>
              ) : (
                <button
                  onClick={handleLaunchPage}
                  className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
                >
                  <img src={ButtonImages.logInBtn} className="w-5 h-5 ml-2" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <button className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded">
              <img src={ButtonImages.helpBtn} className="w-5 h-5 ml-2" />
              <span>Help</span>
            </button>

            {isMobile && (
              <>
                <div className="border-t border-gray-600 my-2"></div>
                <div className="px-2 py-1 text-gray-400 text-sm">Tools</div>
                <button
                  onClick={() => {
                    handleToolSelect("pen");
                    setSelectedShape(null); // Explicitly set to null for freehand drawing
                  }}
                  className={`menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded${
                    selectedTool === "pen" ? "bg-[#403d6a]" : ""
                  }`}
                >
                  <img
                    src={ButtonImages.pencilImg}
                    alt="Pencil"
                    className="w-4 h-4"
                  />
                  Pen
                </button>
                <button
                  onClick={() => handleToolSelect("eraser")}
                  className={`menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded${
                    selectedTool === "eraser" ? "bg-[#403d6a]" : ""
                  }`}
                >
                  <img
                    src={ButtonImages.eraserImg}
                    alt="Eraser"
                    className="w-4 h-4"
                  />
                  Eraser
                </button>
                <button
                  onClick={() => handleToolSelect("textBox")}
                  className={`menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded${
                    selectedTool === "textBox" ? "bg-[#403d6a]" : ""
                  }`}
                >
                  <img
                    src={ButtonImages.textBoxImage}
                    alt="Text Box"
                    className="w-4 h-4"
                  />
                  Text Box
                </button>
                <div className="relative">
                  <button
                    className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
                    onClick={() =>
                      setShowSidebarShapesDropdown(!showSidebarShapesDropdown)
                    }
                  >
                    <img
                      src={ButtonImages.shapesBtn}
                      className="w-5 h-5 ml-2"
                    />
                    <span>Shapes</span>
                  </button>

                  {showSidebarShapesDropdown && (
                    <div className="absolute left-0 w-full bg-gray-800 rounded-md shadow-lg z-[100] mt-1 border border-gray-700">
                      <button
                        className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          setSelectedTool("pen");
                          setSelectedShape("rectangle");
                          setShowSidebarShapesDropdown(false);
                        }}
                      >
                        <div className="w-5 h-5  border border-gray-300 flex items-center justify-center">
                          <div className="w-3 h-3 bg-gray-300"></div>
                        </div>
                        <span>Rectangle</span>
                      </button>
                      <button
                        className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          setSelectedTool("pen");
                          setSelectedShape("circle");
                          setShowSidebarShapesDropdown(false);
                        }}
                      >
                        <div className="w-5 h-5 ml-2 border border-gray-300 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        </div>
                        <span>Circle</span>
                      </button>
                      <button
                        className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          setSelectedTool("pen");
                          setSelectedShape("line");
                          setShowSidebarShapesDropdown(false);
                        }}
                      >
                        <div className="w-5 h-5 ml-2 flex items-center justify-center">
                          <div className="w-4 h-0.5 bg-gray-300 transform rotate-45"></div>
                        </div>
                        <span>Line</span>
                      </button>
                      <button
                        className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          setSelectedTool("pen");
                          setSelectedShape("arrow");
                          setShowShapesDropdown(false);
                        }}
                      >
                        <div className="w-5 h-5 ml-2 flex items-center justify-center">
                          <div className="w-4 h-0.5 bg-gray-300 relative">
                            <div className="absolute right-0 top-0 w-2 h-0.5 bg-gray-300 transform rotate-45 origin-right"></div>
                            <div className="absolute right-0 top-0 w-2 h-0.5 bg-gray-300 transform -rotate-45 origin-right"></div>
                          </div>
                        </div>
                        <span>Arrow</span>
                      </button>
                      <button
                        className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          setSelectedTool("pen");
                          setSelectedShape("triangle");
                          setShowShapesDropdown(false);
                        }}
                      >
                        <div className="w-5 h-5 ml-2 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-transparent border-b-gray-300"></div>
                        </div>
                        <span>Triangle</span>
                      </button>
                      {/* Other shape buttons */}
                    </div>
                  )}
                </div>
                <div className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded">
                  <input
                    type="color"
                    value={penColor}
                    onChange={(e) => setPenColor(e.target.value)}
                    className="w-full h-8 cursor-pointer rounded-lg "
                  />
                </div>
                <div className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded">
                  <div className="flex items-center">
                    <span className="text-white mr-2">Size</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={penSize}
                      onChange={(e) => setPenSize(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-white ml-2">{penSize}px</span>
                  </div>
                </div>
                <button
                  onClick={resetCanvas}
                  className="menu-item flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700 rounded"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="bg-gray-900 min-h-screen flex flex-col items-center overflow-y-auto max-h-screen pt-16 sm:pt-8 mt-8">
          {canvasesMetadata.map((canvas) => (
            <div
              key={canvas.id}
              className={`canvas bg-gray-800 border ${
                canvas.id === activeCanvasId
                  ? "border-blue-500 border-2"
                  : "border-gray-700"
              } rounded-lg w-11/12 h-full my-4 relative`}
              style={{ minHeight: "90vh", paddingBottom: "2rem" }}
              onClick={() => handleCanvasSelect(canvas.id)}
            >
              <canvas
                ref={(el) => (canvasRefs.current[canvas.id] = el)}
                width={window.innerWidth}
                height={window.innerHeight - 60}
                onMouseDown={(e) => startDrawing(e, canvas.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  // Touch event handling doesn't need rect calculation here
                  const touch = e.touches[0];
                  startDrawing(
                    {
                      clientX: touch.clientX,
                      clientY: touch.clientY,
                    } as unknown as React.MouseEvent<HTMLCanvasElement>,
                    canvas.id
                  );
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseMove={(e) => draw(e, canvas.id)}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  draw(
                    {
                      clientX: touch.clientX,
                      clientY: touch.clientY,
                    } as unknown as React.MouseEvent<HTMLCanvasElement>,
                    canvas.id
                  );
                }}
                onMouseUp={() => stopDrawing(canvas.id)}
                onTouchEnd={() => stopDrawing(canvas.id)}
                onMouseOut={() => stopDrawing(canvas.id)}
                onTouchCancel={() => stopDrawing(canvas.id)}
              />
              {activeCanvasId !== null && textInputPosition && (
                <div
                  className="absolute"
                  style={{
                    left: textInputPosition.x,
                    top: textInputPosition.y,
                    zIndex: 1000,
                  }}
                >
                  <div className="bg-gray-800 p-1 mb-1 rounded flex space-x-2 items-center">
                    <button
                      className={`p-1 rounded ${
                        textInputRef.current?.style.fontWeight === "bold"
                          ? "bg-blue-500"
                          : "bg-gray-700"
                      }`}
                      onClick={() => {
                        if (textInputRef.current) {
                          textInputRef.current.style.fontWeight =
                            textInputRef.current.style.fontWeight === "bold"
                              ? "normal"
                              : "bold";
                          textInputRef.current.focus();
                        }
                      }}
                      title="Bold"
                    >
                      <span className="font-bold text-white">B</span>
                    </button>
                    <button
                      className={`p-1 rounded ${
                        textInputRef.current?.style.fontStyle === "italic"
                          ? "bg-blue-500"
                          : "bg-gray-700"
                      }`}
                      onClick={() => {
                        if (textInputRef.current) {
                          textInputRef.current.style.fontStyle =
                            textInputRef.current.style.fontStyle === "italic"
                              ? "normal"
                              : "italic";
                          textInputRef.current.focus();
                        }
                      }}
                      title="Italic"
                    >
                      <span className="italic text-white">I</span>
                    </button>
                    <button
                      className={`p-1 rounded ${
                        textInputRef.current?.style.textDecoration ===
                        "underline"
                          ? "bg-blue-500"
                          : "bg-gray-700"
                      }`}
                      onClick={() => {
                        if (textInputRef.current) {
                          textInputRef.current.style.textDecoration =
                            textInputRef.current.style.textDecoration ===
                            "underline"
                              ? "none"
                              : "underline";
                          textInputRef.current.focus();
                        }
                      }}
                      title="Underline"
                    >
                      <span className="underline text-white">U</span>
                    </button>

                    {/* Add a divider and delete button */}
                    <div className="border-l border-gray-600 mx-1 h-5"></div>
                    <button
                      className="p-1 rounded bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        // If editing an existing text element
                        if (activeTextId) {
                          // Mark the text element as deleted
                          const updatedTextElements = textElements.map((el) =>
                            el.id === activeTextId
                              ? { ...el, deleted: true }
                              : el
                          );

                          setTextElements(updatedTextElements);

                          // Save the updated text elements to localStorage
                          localStorage.setItem(
                            "canvasTextElements",
                            JSON.stringify(updatedTextElements)
                          );

                          // Redraw the canvas without this text element
                          if (activeCanvasId !== null) {
                            const canvas = canvasRefs.current[activeCanvasId];
                            if (canvas) {
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                // Take a snapshot of the current canvas state
                                const currentState = ctx.getImageData(
                                  0,
                                  0,
                                  canvas.width,
                                  canvas.height
                                );

                                // Save current state before removing text
                                const state =
                                  canvasStates.current[activeCanvasId];
                                if (state) {
                                  state.undoStack.push(currentState);
                                  state.redoStack = [];
                                }

                                // Clear the canvas
                                ctx.clearRect(
                                  0,
                                  0,
                                  canvas.width,
                                  canvas.height
                                );

                                // Restore the current state
                                ctx.putImageData(currentState, 0, 0);

                                // Clear the area where the text was
                                const textToDelete = updatedTextElements.find(
                                  (el) => el.id === activeTextId
                                );
                                if (textToDelete) {
                                  // Calculate text dimensions
                                  ctx.font = `${
                                    textToDelete.isItalic ? "italic " : ""
                                  }${textToDelete.isBold ? "bold " : ""}${
                                    textToDelete.fontSize
                                  }px Arial`;

                                  const lines = textToDelete.text.split("\n");
                                  const lineHeight =
                                    textToDelete.fontSize * 1.2;
                                  let maxWidth = 0;

                                  // Find the maximum width of all lines
                                  lines.forEach((line) => {
                                    const metrics = ctx.measureText(line);
                                    maxWidth = Math.max(
                                      maxWidth,
                                      metrics.width
                                    );
                                  });

                                  // Clear the text area with a small padding
                                  const padding = 2;
                                  ctx.clearRect(
                                    textToDelete.position.x - padding,
                                    textToDelete.position.y - padding,
                                    maxWidth + padding * 2,
                                    lines.length * lineHeight + padding * 2
                                  );
                                }

                                // Save to localStorage
                                saveCanvasToLocalStorage(
                                  activeCanvasId,
                                  canvas
                                );
                              }
                            }
                          }
                        }

                        // Close the text input
                        setTextInputPosition(null);
                        setTextInputValue("");
                        setActiveTextId(null);
                        setShowTextSelectionBox(false);
                        setTextSelectionBox(null);
                      }}
                      title="Delete Text"
                    >
                      <span className="text-white">🗑️</span>
                    </button>
                  </div>
                  <textarea
                    ref={textInputRef}
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTextConfirm();
                      } else if (e.key === "Escape") {
                        setTextInputPosition(null);
                        setTextInputValue("");
                        setActiveTextId(null);
                        setShowTextSelectionBox(false);
                      }
                    }}
                    className="border border-blue-500 bg-transparent text-black p-1 outline-none"
                    style={{
                      minWidth: "150px",
                      minHeight: "30px",
                      resize: "both",
                      fontFamily: "Arial",
                      fontSize: `${penSize * 2}px`,
                      fontWeight:
                        textInputRef.current?.style.fontWeight || "normal",
                      fontStyle:
                        textInputRef.current?.style.fontStyle || "normal",
                      textDecoration:
                        textInputRef.current?.style.textDecoration || "none",
                      textAlign:
                        (textInputRef.current?.style.textAlign as any) ||
                        "left",
                      color: penColor,
                    }}
                    autoFocus
                  />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <span className="bg-gray-700 px-2 py-1 rounded text-white text-xs">
                  {canvas.id === activeCanvasId
                    ? "Active"
                    : "Click to activate"}
                </span>
                {canvasesMetadata.length > 1 && (
                  <button
                    className="bg-[#403d6a] hover:bg-[#2c2a46] px-2 py-1 rounded text-white text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCanvas(canvas.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-gray-700 px-2 py-1 rounded text-white text-xs">
                {canvas.name}
              </div>
              <div className="absolute bottom-0 right-2  px-2 py-1 rounded text-sm">
                <button
                  onClick={resetCanvas}
                  className=" flex items-center gap-2 w-full p-2 bg-[#403d6a] text-gray-300 hover:bg-[#2c2a46] rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}

          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <button
              onClick={addCanvas}
              className="bg-[#403d6a] hover:bg-[#2c2a46] text-white flex items-center px-4 py-2 rounded-lg"
            >
              Add Canvas
            </button>
          </div>

          {/*  Navbar */}
          <div className="navbar fixed top-0 left-0 right-0 bg-gray-800 flex gap-2 p-2 z-10">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="openbtn p-2 text-white hover:bg-gray-700"
            >
              ☰
            </button>
            <span>
              <button
                onClick={handleInscribeBtn}
                className=" absolute left-12 top-4  cursor-pointer"
              >
                <img src={ButtonImages.inscribeImg} className="w-30 h-8 " />
              </button>
            </span>

            <div className="tools flex justify-center items-center flex-1 overflow-x-auto gap-1 bg-gray-800 ">
              {!isMobile && (
                <>
                  <button
                    onClick={() => {
                      // First commit any active text input before switching tools
                      if (
                        selectedTool === "textBox" &&
                        textInputPosition &&
                        textInputValue.trim()
                      ) {
                        return; // Exit the function her
                      }

                      handleToolSelect("pen");
                    }}
                    className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                      selectedTool === "pen" ? "bg-[#403d6a]" : "bg-gray-700"
                    }`}
                    title="Pen (1)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.pencilImg}
                        alt="Drawing Tools"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-1 text-xs text-white bg-transparent w-2 h-2 flex items-center justify-center">
                        1
                      </span>
                    </div>
                  </button>

                  <button
                    className={`tool  p-2 rounded-md hover:bg-[#403d6a] 
                    ${
                      selectedTool === "selection"
                        ? "bg-[#403d6a]"
                        : "bg-gray-700"
                    }`}
                    onClick={() => handleToolSelect("selection")}
                    title="Selection Tool (2)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.selectionBtn}
                        alt="Selection"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-3 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleToolSelect("eraser")}
                    className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                      selectedTool === "eraser" ? "bg-[#403d6a]" : "bg-gray-700"
                    }`}
                    title="Eraser (3)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.eraserImg}
                        alt="Eraser"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-1 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                        3
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleToolSelect("textBox");
                    }}
                    className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                      selectedTool === "textBox"
                        ? "bg-[#403d6a]"
                        : "bg-gray-700"
                    }`}
                    title="Text Box (4)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.textBoxImage}
                        alt="Text Box"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-1 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                        4
                      </span>
                    </div>
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShapesDropdown(!showShapesDropdown);
                      }}
                      className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                        selectedShape ? "bg-[#403d6a]" : "bg-gray-700"
                      }`}
                      title="Shapes (4)"
                    >
                      <div className="relative">
                        <img
                          src={ButtonImages.shapesBtn}
                          alt="Shapes"
                          className="w-5 h-5"
                          title="Shapes (5)"
                        />
                        <span className="absolute -bottom-0 -right-2 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                          5
                        </span>
                      </div>
                    </button>
                    {showShapesDropdown && (
                      <div
                        className="fixed mt-1 bg-gray-800 rounded-md shadow-lg z-[9999] border border-gray-700 w-40"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          top: "50px", // Position below the navbar
                          left: "calc(50% - 100px)", // Center horizontally
                        }}
                      >
                        <button
                          className="flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setSelectedTool("pen");
                            setSelectedShape("rectangle");
                            setShowShapesDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5 border border-gray-300 flex items-center justify-center">
                            <div className="w-3 h-3 bg-gray-300"></div>
                          </div>
                          <span>Rectangle</span>
                        </button>
                        <button
                          className=" flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setSelectedTool("pen");
                            setSelectedShape("circle");
                            setShowShapesDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5  border border-gray-300 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                          </div>
                          <span>Circle</span>
                        </button>
                        <button
                          className=" flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setSelectedTool("pen");
                            setSelectedShape("line");
                            setShowShapesDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5  flex items-center justify-center">
                            <div className="w-4 h-0.5 bg-gray-300 transform rotate-45"></div>
                          </div>
                          <span>Line</span>
                        </button>
                        <button
                          className=" flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setSelectedTool("pen");
                            setSelectedShape("arrow");
                            setShowShapesDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5  flex items-center justify-center">
                            <div className="w-4 h-0.5 bg-gray-300 relative">
                              <div className="absolute right-0 top-0 w-2 h-0.5 bg-gray-300 transform rotate-45 origin-right"></div>
                              <div className="absolute right-0 top-0 w-2 h-0.5 bg-gray-300 transform -rotate-45 origin-right"></div>
                            </div>
                          </div>
                          <span>Arrow</span>
                        </button>
                        <button
                          className=" flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setSelectedTool("pen");
                            setSelectedShape("triangle");
                            setShowShapesDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5  flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-transparent border-b-gray-300"></div>
                          </div>
                          <span>Triangle</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isMobile && (
                <>
                  <button
                    onClick={undo}
                    className="tool p-2 rounded-md bg-gray-700 hover:bg-[#403d6a]"
                    title="Undo (Ctrl+Z)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.undoImg}
                        alt="Undo"
                        className="w-5 h-5"
                      />
                    </div>
                  </button>
                  <button
                    onClick={redo}
                    className="tool p-2 rounded-md bg-gray-700 hover:bg-[#403d6a]"
                    title="Redo (Ctrl+Y)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.redoImg}
                        alt="Redo"
                        className="w-5 h-5"
                      />
                    </div>
                  </button>
                </>
              )}

              <div className="absolute gap-2 right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                {isMobile && (
                  <>
                    <button
                      onClick={undo}
                      className="tool p-2 rounded-md bg-gray-700 hover:bg-[#403d6a] mr-1"
                      title="Undo"
                    >
                      <img
                        src={ButtonImages.undoImg}
                        alt="Undo"
                        className="w-5 h-5"
                      />
                    </button>
                    <button
                      onClick={redo}
                      className="tool p-2 rounded-md bg-gray-700 hover:bg-[#403d6a] mr-1"
                      title="Redo"
                    >
                      <img
                        src={ButtonImages.redoImg}
                        alt="Redo"
                        className="w-5 h-5"
                      />
                    </button>
                  </>
                )}
                <button
                  className="tool p-2 rounded-full bg-[#403d6a] hover:bg-[#2c2a46]"
                  onClick={() => runRoute()}
                  title="AI Search"
                >
                  <img src={ButtonImages.aiBtn} alt="AI" className="w-5 h-5" />
                </button>
                <button
                  className="tool p-2  rounded-full bg-[#403d6a] hover:bg-[#2c2a46]"
                  onClick={() => setIsResultsSidebarOpen(true)}
                  title="AI Side Bar"
                >
                  <img
                    src={ButtonImages.sideBarBtn}
                    className="w-5 h-5 filter invert"
                  />
                </button>
              </div>

              {!isMobile && (
                <>
                  <div className="stroketool flex items-center  p-2 rounded-md">
                    <div className="slider-container flex items-center">
                      <span className="slider-value text-white mr-2">
                        {penSize}px
                      </span>
                      <input
                        id="slider"
                        type="range"
                        min="1"
                        max="20"
                        value={penSize}
                        onChange={(e) => setPenSize(Number(e.target.value))}
                        className="slider w-24"
                        title="Size Toggler"
                      />
                    </div>
                  </div>
                  <div className="flex items-center  p-2 rounded-md">
                    <input
                      id="color-picker"
                      className="colorPicker cursor-pointer rounded-md w-8 h-8 border-0"
                      type="color"
                      title="Colour Picker"
                      value={penColor}
                      onChange={(e) => setPenColor(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Results Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen bg-gray-800 z-50 transition-all duration-300 ${
          isResultsSidebarOpen ? "w-96" : "w-0"
        } overflow-x-hidden shadow-xl`}
      >
        <div className="p-4">
          <button
            onClick={() => setIsResultsSidebarOpen(false)}
            className="text-white text-2xl absolute right-4 top-4 hover:text-gray-300"
          >
            &times;
          </button>
          {isResultsSidebarOpen && (
            <span className="text-white text-xl absolute font-bold  top-4">
              Canvas Search
            </span>
          )}

          <div className="mt-12 space-y-4">
            <button
              onClick={() => {
                setSearchHistory([]);
                localStorage.removeItem("searchHistory");
              }}
              className="bg-[#403d6a] hover:bg-[#2c2a46]   text-white px-4 py-2 rounded mb-4"
            >
              Clear History
            </button>

            <div className="overflow-y-auto h-[calc(100vh-200px)]">
              {searchHistory.map((search, index) => (
                <div
                  key={index}
                  className="bg-gray-700 p-4 rounded-lg text-white mb-4"
                >
                  <div className="flex justify-end gap-2 items-center mb-2">
                    <span className="text-sm text-gray-300">
                      {search.timestamp}
                    </span>
                    <button
                      onClick={() => {
                        setSearchHistory((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="text-gray-400  hover:text-white"
                    >
                      <img
                        src={ButtonImages.crossBtn}
                        alt="Cross"
                        className="w-4 h-4"
                      />
                    </button>
                    <button
                      onClick={() => {
                        const resultText = search.results
                          .map(
                            (result) =>
                              `${result.expression
                                .split("")
                                .join(" ")} = ${result.answer
                                .split("")
                                .join(" ")}`
                          )
                          .join("\n");
                        navigator.clipboard.writeText(resultText).then(
                          () => {},
                          (err) => {
                            console.error("Could not copy text: ", err);
                          }
                        );
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <img
                        src={ButtonImages.copyBtn}
                        alt="Copy"
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                  {search.results.map((result, resultIndex) => (
                    <ResultItemWithSteps key={resultIndex} result={result} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 my-2"></div>

        {/* AI Chat Box */}
        <div className="px-2 py-1 text-gray-400 text-sm">AI Assistant</div>

        <div className="chat-container flex flex-col h-64 mt-2">
          {/* Chat Messages */}
          <div className="chat-messages flex-1 overflow-y-auto p-2 bg-gray-900 rounded border border-gray-700 mb-2">
            {chatMessages.length === 0 ? (
              <div className="text-gray-500 text-center text-sm py-2">
                Ask me anything !
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 p-2 rounded max-w-[90%] ${
                    msg.isUser
                      ? "bg-blue-800 text-white ml-auto"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  <div className="text-sm">{formatChatMessage(msg.text)}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="bg-gray-800 text-gray-200 p-2 rounded max-w-[90%] mb-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="chat-input flex">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l outline-none text-sm"
            />
            <button
              onClick={sendChatMessage}
              disabled={isChatLoading || !chatInput.trim()}
              className={`px-3 py-2 rounded-r ${
                isChatLoading || !chatInput.trim()
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>{" "}
      {selectedArea && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center z-50">
          <span>Active Selection</span>
          <br />
          <button
            onClick={clearSelection}
            className="ml-3 bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
