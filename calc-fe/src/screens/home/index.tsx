// import { ColorSwatch, Group } from '@mantine/core';
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Draggable from "react-draggable";
// import {SWATCHES} from '@/constants';
import "@/screens/home/inde.css";
// import {LazyBrush} from 'lazy-brush';
import undoImage from "./assets/undo.png";
import redoImage from "./assets/redo.png";
import pencilImage from "./assets/pencil.png";
import eraserImage from "./assets/eraser.png";
import textBoxImage from "./assets/textbox.png";

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult[]>([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedTool, setSelectedTool] = useState<string>("pen");
  const [textBoxContent, setTextBoxContent] = useState("");
  const [textBoxVisible, setTextBoxVisible] = useState(false);

  // const lazyBrush = new LazyBrush({
  //     radius: 10,
  //     enabled: true,
  //     initialPoint: { x: 0, y: 0 },
  // });

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
        console.log("r", r);
        renderLatexToCanvas(r.expression, r.answer);
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
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvasRef.current.style.background = "#161718";
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

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // const renderLatexToCanvas = (expression: string, answer: string) => {
  //     const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
  //     setLatexExpression([...latexExpression, latex]);

  //     // Clear the main canvas
  //     const canvas = canvasRef.current;
  //     if (canvas) {
  //         const ctx = canvas.getContext('2d');
  //         if (ctx) {
  //             ctx.clearRect(0, 0, canvas.width, canvas.height);
  //         }
  //     }
  // };

  const renderLatexToCanvas = (
    expression: string,
    answer: string,
    isMath: boolean
  ) => {
    // Ensure inputs are strings
    const ensureString = (input: any): string => {
      return typeof input === "string" ? input : String(input);
    };

    // Escape special characters for LaTeX
    const escapeForLatex = (input: string): string => {
      return input.replace(/_/g, "\\_"); // Escape underscores
    };

    // Ensure inputs are strings before processing
    const safeExpression = ensureString(expression);
    const safeAnswer = ensureString(answer);

    // Format the expression and answer based on their type
    const formattedExpression = isMath
      ? safeExpression // Directly use math expressions
      : `\\text{${escapeForLatex(safeExpression)}}`; // Format plain text

    const formattedAnswer = isMath
      ? safeAnswer // Directly use math expressions
      : `\\text{${escapeForLatex(safeAnswer)}}`; // Format plain text

    // Construct the LaTeX string
    const latex = `\\(\\LARGE{${formattedExpression} \\quad = \\quad ${formattedAnswer}}\\)`;

    // Update state with the new LaTeX expression
    setLatexExpression((prevLatex) => [...prevLatex, latex]); // Fix is here

    // Clear the main canvas (if needed)
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      saveToHistory();
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const response = await axios({
        method: "post",
        url: `http://localhost:8900/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      const resp = await response.data;
      console.log("Response", resp);
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          });
        }
      });

      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (imageData.data[i + 3] > 0) {
            // If pixel is not transparent
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setLatexPosition({ x: centerX, y: centerY });
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          const resultFromBack = {
            expression: data.expr,
            answer: data.result,
          };
          setResult((prevRes) => [...(prevRes || []), resultFromBack]);
        }, 1000);
      });
    }
  };

  const useEraser = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = strokeWidth;
      }
    }
  };

  const disableEraser = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = color;
      }
    }
  };

  const enableTextBox = () => {
    setTextBoxVisible(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Remove any previously created input elements
        document
          .querySelectorAll(".text-input")
          .forEach((input) => input.remove());

        // Add an event listener for the canvas click to create a textbox
        canvas.addEventListener(
          "click",
          (e) => {
            const x = e.offsetX;
            const y = e.offsetY;

            // Create the input element
            const input = document.createElement("input");
            input.type = "text";
            input.classList.add("text-input");
            input.style.position = "absolute";
            input.style.left = `${x}px`;
            input.style.top = `${y}px`;
            input.style.background = "transparent";
            input.style.color = color;
            input.style.border = "none";
            input.style.outline = "none";
            input.style.fontSize = "20px"; // Set font size for the input box
            input.style.zIndex = "1000";
            document.body.appendChild(input);
            input.focus();

            // Handle blur event when user finishes typing
            input.addEventListener("blur", () => {
              // Set a reasonable font size for canvas rendering
              const canvasFontSize = "20px"; // Larger font size for the canvas text
              ctx.font = `bold ${canvasFontSize} Arial`;
              ctx.fillStyle = color;
              ctx.fillText(input.value, x, y);
              document.body.removeChild(input);
            });
          },
          { once: true }
        );
      }
    }
  };
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, snapshot]);
      }
    }
  };

  const undo = () => {
    if (history.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const lastState = history.pop(); // Remove the last saved state
          setRedoStack((prev) => [
            ...prev,
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          ]); // Save the current state to the redo stack
          if (lastState) {
            ctx.putImageData(lastState, 0, 0); // Restore the previous state
          }
        }
      }
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const redoState = redoStack.pop(); // Remove the last state from the redo stack
          setHistory((prev) => [
            ...prev,
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          ]); // Save the current state to the history stack
          if (redoState) {
            ctx.putImageData(redoState, 0, 0); // Restore the redo state
          }
        }
      }
    }
  };

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);

    if (tool === "pen") {
      disableEraser();
    }
    // If eraser is selected, enable eraser mode
    else if (tool === "eraser") {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEraser();
    } else if (tool === "textBox") {
      enableTextBox();
    }
  };

  return (
    <>
      <div className="tool-container flex justify-between mt-2 ">
        <Button
          onClick={() => setReset(true)}
          className="z-20 mainButton text-white  mr-10 ml-10 hover:bg-[#403d6a] "
          variant="default"
          color="red"
        >
          Reset
        </Button>
        <div className="useful-tools">
        <div className="tools">
          <Button
            // onClick={disableEraser}
            onClick={() => handleToolSelect("pen")}
            className={`z-20 navButton mr-10 text-white hover:bg-[#403d6a]  ${
              selectedTool === "pen" ? "active" : ""
            }`}
            variant="default"
            color="white"
          >
            <img src={pencilImage} alt="Pencil" className="h-6 w-6" />
          </Button>
          <Button
            // onClick={useEraser}
            onClick={() => handleToolSelect("eraser")}
            className={`tool z-20 navButton mr-10 text-white hover:bg-[#403d6a] ${
              selectedTool === "eraser" ? "active" : ""
            }`}
            variant="default"
            color="white"
          >
            <img src={eraserImage} alt="Eraser" className="h-6 w-6" />
          </Button>
          <Button
            // onClick={enableTextBox}
            onClick={() => handleToolSelect("textBox")}
            className={`tool z-20 navButton mr-10 text-white hover:bg-[#403d6a]  ${
              selectedTool === "textBox" ? "active" : ""
            }`}
            variant="default"
            color="white"
          >
            <img src={textBoxImage} alt="Text Box" className="h-6 w-6 " />
          </Button>
          <Button
            onClick={undo}
            className="tool z-20 navButton mr-10 text-white hover:bg-[#403d6a] "
            variant="default"
            color="white"
          >
            <img src={undoImage} alt="Undo" className="h-6 w-6" />
          </Button>
          <Button
            onClick={redo}
            className="tool z-20 navButton mr-10 text-white hover:bg-[#403d6a] "
            variant="default"
            color="white"
          >
            <img src={redoImage} alt="Redo" className="h-6 w-6" />
          </Button>

          {/* <div id="stroke" className="z-20 h-10 w-30 mr-10">
            <div className="slider-container">
              <span className="slider-value">{strokeWidth}px</span>
              <input
                id="slider"
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="ml-2 mt-2 slider"
              />
            </div>
          </div> */}

          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="tool z-20 colorPicker p-0 border-none mr-10  cursor-pointer rounded-md"
          />
        </div>

        <div id="stroke" className="stroke-tool z-20 h-10 w-30 mr-10">
            <div className="slider-container">
              <span className="slider-value">{strokeWidth}px</span>
              <input
                id="slider"
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="ml-2 mt-2 slider"
              />
            </div>
          </div>
          </div>
        <Button
          onClick={runRoute}
          className="z-20 mainButton text-white  mr-10 ml-10 hover:bg-[#403d6a]"
          variant="default"
          color="white"
        >
          Run
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={{
              x: latexPosition.x,
              y: latexPosition.y + 30 * index,
            }} // Offset by index
            onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute p-2 text-white rounded ">
              <div className="latex-content">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}
// function setRedoStack(arg0: (prev: any) => any[]) {
//     throw new Error('Function not implemented.');
// }
