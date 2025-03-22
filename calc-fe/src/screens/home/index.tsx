import { useState, useRef, useEffect } from "react";
import "./inde.css";
import axios from "axios";
import { jsPDF } from "jspdf";
import * as ButtonImages from "./components/Button/button";
import { useNavigate } from "react-router-dom";
// Removed unused import 'rough'
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
    "pen" | "eraser" | "textBox"
  >("pen");
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const canvasStates = useRef<
    Record<number, { undoStack: ImageData[]; redoStack: ImageData[] }>
  >({});
  // Track which canvases have been initialized
  const initializedCanvases = useRef<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [reset, setReset] = useState<boolean>(false);
  const [draggedImageInfo, setDraggedImageInfo] = useState<{
    img: HTMLImageElement | null;
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [textInputPosition, setTextInputPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
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
    // Add this with your other state variables
    const [showPenDropdown, setShowPenDropdown] = useState(false);  
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Add this to your useEffect that handles click outside for dropdowns
    useEffect(() => {
      const handleClickOutside = () => {
        setShowShapesDropdown(false);
        setShowPenDropdown(false); // Add this line
      };
      
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, []);

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
    const mainContainer = document.getElementById('root') || document.body;
    mainContainer.classList.add('fade-out');

    // Navigate to launch page
    setTimeout(() => {
      navigate('/');
      setTimeout(() => {
        mainContainer.classList.remove('fade-out');
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

  //   const canvas = canvasRefs.current[activeCanvasId as number];

  //   if (canvas) {
  //     const response = await axios({
  //       method: "post",
  //       url: `http://localhost:8900/calculate`,
  //       data: {
  //         image: canvas.toDataURL("image/png"),
  //         dict_of_vars: dictOfVars,
  //       },
  //     });

  //     const resp = await response.data;
  //     console.log("Response", resp);
  //     resp.data.forEach((data: Response) => {
  //       if (data.assign === true) {
  //         setDictOfVars({
  //           ...dictOfVars,
  //           [data.expr]: data.result,
  //         });
  //       }
  //     });

  //     const ctx = canvas.getContext("2d");
  //     if (!ctx) return;
  //     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  //     let minX = canvas.width,
  //       minY = canvas.height,
  //       maxX = 0,
  //       maxY = 0;

  //     for (let y = 0; y < canvas.height; y++) {
  //       for (let x = 0; x < canvas.width; x++) {
  //         const i = (y * canvas.width + x) * 4;
  //         if (imageData.data[i + 3] > 0) {
  //           minX = Math.min(minX, x);
  //           minY = Math.min(minY, y);
  //           maxX = Math.max(maxX, x);
  //           maxY = Math.max(maxY, y);
  //         }
  //       }
  //     }

  //     const centerX = (minX + maxX) / 2;
  //     const centerY = (minY + maxY) / 2;

  //     setLatexPosition({
  //       x: centerX,
  //       y: centerY,
  //     });
  //     resp.data.forEach((data: Response, index: number) => {
  //       setTimeout(() => {
  //         setResult((prevRes) => [
  //           ...prevRes,
  //           {
  //             expression: data.expr,
  //             answer: data.result,
  //             position: {
  //               x: centerX,
  //               y: centerY + 30 * index,
  //             },
  //           },
  //         ]);
  //       }, 1000 * index);
  //     });
  //   }
  //   setIsResultsSidebarOpen(true); // Open the results sidebar
  // };

  // Replace your startDrawing function with this:
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

    // Prevent text tool interference
    if (selectedTool === "textBox") {
      const adjustedPosition = adjustTextPosition(e, canvasId);
      if (adjustedPosition) {
        // Instead of immediately showing the text input, we'll create a text element
        // and show the input when the user clicks on it
        const canvas = canvasRefs.current[canvasId];
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        // Create a new text box at this position
        setTextInputPosition({ x: mouseX, y: mouseY });
        setTextInputValue("");

        // Focus the text input after a short delay to ensure it's rendered
        setTimeout(() => {
          if (textInputRef.current) {
            textInputRef.current.focus();
          }
        }, 10);
      }
      return;
    }

    // Get the correct mouse position relative to the canvas
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Existing drag check logic
    if (draggedImageInfo) {
      if (
        mouseX >= draggedImageInfo.x &&
        mouseX <= draggedImageInfo.x + draggedImageInfo.width &&
        mouseY >= draggedImageInfo.y &&
        mouseY <= draggedImageInfo.y + draggedImageInfo.height
      ) {
        setIsDragging(true);
        setDraggedImageInfo({
          ...draggedImageInfo,
          offsetX: mouseX - draggedImageInfo.x,
          offsetY: mouseY - draggedImageInfo.y,
        });
        return;
      }
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
    setDrawing(true);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up drawing context
    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY);

    // Store the starting position
    (ctx as any).lastX = mouseX;
    (ctx as any).lastY = mouseY;

    // Set drawing properties
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = selectedTool === "eraser" ? "rgba(0,0,0,1)" : penColor;
    ctx.globalCompositeOperation =
      selectedTool === "eraser" ? "destination-out" : "source-over";

    // Save initial state
    const state = canvasStates.current[canvasId];
    if (state?.undoStack.length === 0) {
      state.undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  };

  const runRoute = async () => {
    try {
      const canvas = canvasRefs.current[activeCanvasId as number];
      if (!canvas) return;

      const response = await axios.post(`http://localhost:8900/calculate`, {
        image: canvas.toDataURL("image/png"),
        dict_of_vars: dictOfVars,
      });

      const resp = response.data;
      const newResults: GeneratedResult[] = [];

      // Process results
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

      // Add to history
      const historyItem: SearchHistoryItem = {
        timestamp: new Date().toLocaleString(),
        results: newResults,
      };

      setSearchHistory((prev) => [historyItem, ...prev]);
      setCurrentResults(newResults);
      setIsResultsSidebarOpen(true);
    } catch (error) {
      console.error("API error:", error);
      alert("Error processing request");
    }
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

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvasId: number
  ): void => {
    if (canvasId !== activeCanvasId) return;

    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Relationship between CSS width and canvas width
    const scaleY = canvas.height / rect.height; // Relationship between CSS height and canvas height

    // Calculate the exact position with scaling factors
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Handle image dragging
    if (isDragging && draggedImageInfo) {
      const newX = mouseX - draggedImageInfo.offsetX;
      const newY = mouseY - draggedImageInfo.offsetY;

      setDraggedImageInfo({
        ...draggedImageInfo,
        x: newX,
        y: newY,
      });

      // Redraw the canvas with the image at the new position
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Completely clear the canvas to remove the previous image
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the image at its new position
      ctx.drawImage(
        draggedImageInfo.img as HTMLImageElement,
        newX,
        newY,
        draggedImageInfo.width,
        draggedImageInfo.height
      );

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
      
      // Clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Restore previous state
      const state = canvasStates.current[canvasId];
      if (state && state.undoStack.length > 0) {
        ctx.putImageData(state.undoStack[state.undoStack.length - 1], 0, 0);
      }
      
      // Draw the new stroke
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

    // Handle finishing image drag
    if (isDragging && draggedImageInfo) {
      setIsDragging(false);

      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save the current state after dragging
      const state = canvasStates.current[canvasId];
      if (state) {
        state.undoStack = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
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
  //   if (!canvas) return;

  //   const ctx = canvas.getContext("2d");
  //   if (!ctx) return;

  //   // Draw text
  //   ctx.font = `${penSize * 2}px Arial`;
  //   ctx.fillStyle = penColor;
  //   ctx.textBaseline = "top";
  //   ctx.fillText(textInputValue, textInputPosition.x, textInputPosition.y);

  //   // Update undo stack
  //   const state = canvasStates.current[activeCanvasId];
  //   if (state) {
  //     state.undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  //     state.redoStack = [];
  //     saveCanvasToLocalStorage(activeCanvasId, canvas);
  //   }

  //   setTextInputPosition(null);
  //   setTextInputValue("");
  // };

  const handleTextConfirm = (): void => {
    if (!textInputPosition || !textInputValue.trim()) {
      setTextInputPosition(null);
      setTextInputValue("");
      return;
    }

    const canvas =
      activeCanvasId !== null ? canvasRefs.current[activeCanvasId] : null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current state before adding text
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

    // Set text properties
    ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${
      penSize * 2
    }px Arial`;
    ctx.fillStyle = penColor;
    ctx.textAlign = textAlign as CanvasTextAlign;

        // Calculate maximum width for text wrapping (distance from text position to right edge of canvas)
        const maxWidth = canvas.width - textInputPosition.x - 20; // 20px padding from right edge

        // Process the text for rendering with word wrapping
        const words = textInputValue.split(' ');
        const lines: string[] = [];
        let currentLine = words[0] || '';
    
        // Create wrapped lines based on available width
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        
        // Add the last line
        if (currentLine) {
          lines.push(currentLine);
        }
    
        // Handle manual line breaks (from Enter key)
        const wrappedLines: string[] = [];
        lines.forEach(line => {
          const manualBreaks = line.split('\n');
          manualBreaks.forEach(brokenLine => {
            wrappedLines.push(brokenLine);
          });
        });
    
        let yOffset = textInputPosition.y;
        const lineHeight = penSize * 2 * 1.2; // 1.2 times font size for line height
    
        // Calculate x position based on text alignment
        let xPos = textInputPosition.x;
    
        // Draw each wrapped line
        wrappedLines.forEach((line) => {
          // Draw the text with proper alignment
          ctx.fillText(line, xPos, yOffset);
    
          // Add underline if needed
          if (isUnderlined) {
            const textWidth = ctx.measureText(line).width;
            let underlineX = xPos;
    
            // Adjust underline position based on text alignment
            if (textAlign === "center") {
              underlineX = xPos - textWidth / 2;
            } else if (textAlign === "right") {
              underlineX = xPos - textWidth;
            }
    
            ctx.beginPath();
            ctx.moveTo(underlineX, yOffset + 3);
            ctx.lineTo(underlineX + textWidth, yOffset + 3);
            ctx.strokeStyle = penColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
    
          yOffset += lineHeight;
        });
    
        // Save to localStorage after adding text
        if (activeCanvasId !== null) {
          saveCanvasToLocalStorage(activeCanvasId, canvas);
        }

    // Reset text input
    setTextInputPosition(null);
    setTextInputValue("");
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

  const handleToolSelect = (tool: "pen" | "eraser" | "textBox"): void => {
    setSelectedTool(tool);

    // When switching to pen, keep the current shape if it exists
    // When switching to other tools, reset the shape selection
    if (tool !== "pen") {
      setSelectedShape(null);
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
          handleToolSelect("eraser");
          break;
        case "3": // Text box tool
          handleToolSelect("textBox");
          break;
        case "4": // Shapes dropdown
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
              <button
              onClick={handleInscribeBtn}>
              <img src={ButtonImages.inscribeImg} className="w-50 h-10  absolute left-12 top-5 md:right-22 md:left-auto" />
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
              {canvas.id === activeCanvasId && (
                <>
                  {selectedTool === "textBox" && textInputPosition && (
                    <div
                    className="text-box-container"
                    style={{
                      left: `${textInputPosition.x}px`,
                      top: `${textInputPosition.y}px`,
                      maxWidth: `${(canvasRefs.current[activeCanvasId as number]?.width ?? 0) - textInputPosition.x - 20}px`
                    }}
                  >
                      <div
                        className="text-editing-toolbar bg-gray-800 p-1 mb-1 rounded flex gap-1"
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking toolbar
                      >
                        <button
                          className="p-1 hover:bg-gray-700 rounded"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            const textarea = textInputRef.current;
                            if (!textarea) return;

                            // Instead of adding ** symbols, apply styling directly to the textarea
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;

                            // Apply bold styling to the selected text
                            if (textarea.style.fontWeight === "bold") {
                              textarea.style.fontWeight = "normal";
                            } else {
                              textarea.style.fontWeight = "bold";
                            }

                            // Maintain selection
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start, end);
                            }, 10);
                          }}
                          title="Bold"
                        >
                          <span className="font-bold text-white">B</span>
                        </button>
                        <button
                          className="p-1 hover:bg-gray-700 rounded"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            const textarea = textInputRef.current;
                            if (!textarea) return;

                            // Apply italic styling directly
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;

                            if (textarea.style.fontStyle === "italic") {
                              textarea.style.fontStyle = "normal";
                            } else {
                              textarea.style.fontStyle = "italic";
                            }

                            // Maintain selection
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start, end);
                            }, 10);
                          }}
                          title="Italic"
                        >
                          <span className="italic text-white">I</span>
                        </button>
                        <button
                          className="p-1 hover:bg-gray-700 rounded"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            const textarea = textInputRef.current;
                            if (!textarea) return;

                            // Apply underline styling directly
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;

                            if (textarea.style.textDecoration === "underline") {
                              textarea.style.textDecoration = "none";
                            } else {
                              textarea.style.textDecoration = "underline";
                            }

                            // Maintain selection
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start, end);
                            }, 10);
                          }}
                          title="Underline"
                        >
                          <span className="underline text-white">U</span>
                        </button>
                      </div>
                      <textarea
                        ref={textInputRef}
                        value={textInputValue}
                        onChange={(e) => {
                          setTextInputValue(e.target.value);
                          // Auto-expand textarea
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onBlur={handleTextConfirm}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey)
                            handleTextConfirm();
                          if (e.key === "Escape") {
                            setTextInputPosition(null);
                            setTextInputValue("");
                          }
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          color: penColor,
                          border: "2px solid #4299e1",
                          outline: "none",
                          fontSize: `${penSize * 2}px`,
                          pointerEvents: "all",
                          whiteSpace: "pre-wrap",
                          padding: "8px",
                          borderRadius: "4px",
                          width: "100%",
                          maxHeight: "200px",
                          overflowY: "auto",
                          wordWrap: "break-word",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          boxSizing: "border-box"
                        }}
                        className="text-input"
                      />
                    </div>
                  )}{" "}
                </>
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
            className=" absolute left-12 top-4  cursor-pointer">
              <img src={ButtonImages.inscribeImg} className="w-30 h-8 " />
              </button>
              </span>

            <div className="tools flex justify-center items-center flex-1 overflow-x-auto gap-1 bg-gray-800 ">
              {!isMobile && (
                <>
                  <div className="relative">
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPenDropdown(!showPenDropdown);
                      }}
                      className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                        selectedTool === "pen" || selectedTool === "textBox"
                          ? "bg-[#403d6a]"
                          : "bg-gray-700"
                      }`}
                      title="Drawing Tools (1)"
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
                    {showPenDropdown && (
                      <div
                        className="fixed mt-1 bg-gray-800 rounded-md shadow-lg z-[9999] border border-gray-700 w-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="Pen"
                          className="flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            handleToolSelect("pen");
                            setSelectedShape(null);
                            setShowPenDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            <img
                              src={ButtonImages.pencilImg}
                              alt="Pencil"
                              className="w-4 h-4"
                            />
                          </div>
                          <span>Pen</span>
                        </button>
                        <button
                          title="Draw Text"
                          className="flex items-center gap-2 w-full p-2 text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            handleToolSelect("textBox");
                            setShowPenDropdown(false);
                          }}
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            <img
                              src={ButtonImages.textBoxImage}
                              alt="Text Box"
                              className="w-4 h-4"
                            />
                          </div>
                          <span>Draw Text</span>
                        </button>
                      </div>
                    )}                  
                    </div>                  
                  <button
                    onClick={() => handleToolSelect("eraser")}
                    className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                      selectedTool === "eraser" ? "bg-[#403d6a]" : "bg-gray-700"
                    }`}
                    title="Eraser (2)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.eraserImg}
                        alt="Eraser"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-1 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleToolSelect("textBox")}
                    className={`tool p-2 rounded-md hover:bg-[#403d6a] ${
                      selectedTool === "textBox"
                        ? "bg-[#403d6a]"
                        : "bg-gray-700"
                    }`}
                    title="Text Box (3)"
                  >
                    <div className="relative">
                      <img
                        src={ButtonImages.textBoxImage}
                        alt="Text Box"
                        className="w-5 h-5"
                      />
                      <span className="absolute -bottom-0 -right-1 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                        3
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
                          title="Shapes"
                        />
                        <span className="absolute -bottom-0 -right-2 text-xs text-white bg-transparent  w-2 h-2 flex items-center justify-center">
                          4
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
                  <div className="text-sm">{msg.text}</div>
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
    </div>
  );
}
