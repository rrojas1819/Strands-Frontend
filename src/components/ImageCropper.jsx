import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Move, ZoomIn, ZoomOut } from 'lucide-react';

const ImageCropper = ({ file, onCrop, onCancel, aspectRatio = 1 }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          // Calculate initial scale to fit image in container
          const container = containerRef.current;
          if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const imgAspect = img.width / img.height;
            const containerAspect = containerWidth / containerHeight;
            
            let initialScale;
            if (imgAspect > containerAspect) {
              initialScale = containerWidth / img.width;
            } else {
              initialScale = containerHeight / img.height;
            }
            
            // Make it slightly larger so user can zoom in
            initialScale = initialScale * 1.2;
            setScale(initialScale);
            
            // Center the image
            setPosition({
              x: (containerWidth - img.width * initialScale) / 2,
              y: (containerHeight - img.height * initialScale) / 2
            });
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage();
    }
  }, [image, scale, position, containerSize]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw crop area border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([]);

    // Draw image
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;

    ctx.drawImage(
      image,
      position.x,
      position.y,
      imgWidth,
      imgHeight
    );

    // Draw overlay (darken areas outside crop)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // Top
    if (position.y > 0) {
      ctx.fillRect(0, 0, canvas.width, position.y);
    }
    // Bottom
    if (position.y + imgHeight < canvas.height) {
      ctx.fillRect(0, position.y + imgHeight, canvas.width, canvas.height - (position.y + imgHeight));
    }
    // Left
    if (position.x > 0) {
      ctx.fillRect(0, Math.max(0, position.y), position.x, Math.min(imgHeight, canvas.height - Math.max(0, position.y)));
    }
    // Right
    if (position.x + imgWidth < canvas.width) {
      const rightX = position.x + imgWidth;
      ctx.fillRect(rightX, Math.max(0, position.y), canvas.width - rightX, Math.min(imgHeight, canvas.height - Math.max(0, position.y)));
    }
  };

  const getEventPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    e.preventDefault();
    setIsDragging(true);
    const pos = getEventPos(e);
    setDragStart({
      x: pos.x - position.x,
      y: pos.y - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !image) return;
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;

    const pos = getEventPos(e);
    const newX = pos.x - dragStart.x;
    const newY = pos.y - dragStart.y;

    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;
    const maxX = container.clientWidth;
    const maxY = container.clientHeight;

    // Constrain position so image doesn't go completely outside crop area
    const constrainedX = Math.max(maxX - imgWidth, Math.min(0, newX));
    const constrainedY = Math.max(maxY - imgHeight, Math.min(0, newY));

    setPosition({ x: constrainedX, y: constrainedY });
  };

  const handleMouseUp = (e) => {
    if (e) e.preventDefault();
    setIsDragging(false);
  };

  const handleZoom = (delta) => {
    if (!image) return;
    
    const container = containerRef.current;
    if (!container) return;

    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    const scaleChange = newScale / scale;
    
    // Zoom towards center of container
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    
    const newX = centerX - (centerX - position.x) * scaleChange;
    const newY = centerY - (centerY - position.y) * scaleChange;
    
    setScale(newScale);
    
    // Constrain position
    const imgWidth = image.width * newScale;
    const imgHeight = image.height * newScale;
    const constrainedX = Math.max(container.clientWidth - imgWidth, Math.min(0, newX));
    const constrainedY = Math.max(container.clientHeight - imgHeight, Math.min(0, newY));
    
    setPosition({ x: constrainedX, y: constrainedY });
  };

  const handleCrop = () => {
    if (!image || !canvasRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const cropWidth = container.clientWidth;
    const cropHeight = container.clientHeight;

    // Create a new canvas for the cropped image (exactly the size of the crop area)
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const ctx = cropCanvas.getContext('2d');

    // Fill with white background (or transparent, but white is better for photos)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    // Calculate the visible portion of the image within the crop area
    const imgDisplayWidth = image.width * scale;
    const imgDisplayHeight = image.height * scale;

    // Find the intersection of the image rectangle and the crop area
    const imageLeft = position.x;
    const imageTop = position.y;
    const imageRight = position.x + imgDisplayWidth;
    const imageBottom = position.y + imgDisplayHeight;

    const cropLeft = 0;
    const cropTop = 0;
    const cropRight = cropWidth;
    const cropBottom = cropHeight;

    // Calculate intersection
    const visibleLeft = Math.max(cropLeft, imageLeft);
    const visibleTop = Math.max(cropTop, imageTop);
    const visibleRight = Math.min(cropRight, imageRight);
    const visibleBottom = Math.min(cropBottom, imageBottom);

    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    if (visibleWidth > 0 && visibleHeight > 0) {
      // Calculate source coordinates in the original image
      const sourceX = (visibleLeft - imageLeft) / scale;
      const sourceY = (visibleTop - imageTop) / scale;
      const sourceWidth = visibleWidth / scale;
      const sourceHeight = visibleHeight / scale;

      // Draw the visible portion
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        visibleLeft,
        visibleTop,
        visibleWidth,
        visibleHeight
      );
    }

    // Convert to blob
    cropCanvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        onCrop(croppedFile);
      }
    }, file.type, 0.95);
  };

  if (!file || !image) {
    return (
      <div className="w-full h-72 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading image...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full max-w-sm h-72 rounded-md border-2 border-blue-500 overflow-hidden bg-gray-900 cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none' }}
        />
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Move className="w-3 h-3" />
          <span>Drag to move</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleZoom(-0.1)}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="w-4 h-4 mr-1" />
          Zoom Out
        </Button>
        <div className="flex-1 text-center text-sm text-muted-foreground">
          {Math.round(scale * 100)}%
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleZoom(0.1)}
          disabled={scale >= 3}
        >
          <ZoomIn className="w-4 h-4 mr-1" />
          Zoom In
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleCrop}
        >
          Apply Crop
        </Button>
      </div>
    </div>
  );
};

export default ImageCropper;

