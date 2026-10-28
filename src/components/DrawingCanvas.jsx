import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pencil, Eraser, Trash2 } from 'lucide-react';

export const CANVAS_W = 800;
export const CANVAS_H = 600;

const COLORS = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207', '#9ca3af'];
const SIZES = [3, 6, 12, 24];

/**
 * 터치/펜슬 최적화 캔버스.
 * ref.toDataURL() → 흰 배경 PNG data URL, ref.clear() → 초기화
 */
const DrawingCanvas = forwardRef(function DrawingCanvas({ disabled = false }, ref) {
	const canvasRef = useRef(null);
	const drawing = useRef(false);
	const last = useRef(null);
	const [color, setColor] = useState(COLORS[0]);
	const [size, setSize] = useState(SIZES[1]);
	const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'

	useEffect(() => {
		const canvas = canvasRef.current;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = CANVAS_W * dpr;
		canvas.height = CANVAS_H * dpr;
		const ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	}, []);

	useImperativeHandle(ref, () => ({
		toDataURL() {
			const off = document.createElement('canvas');
			off.width = CANVAS_W;
			off.height = CANVAS_H;
			const octx = off.getContext('2d');
			octx.fillStyle = '#ffffff';
			octx.fillRect(0, 0, CANVAS_W, CANVAS_H);
			octx.drawImage(canvasRef.current, 0, 0, CANVAS_W, CANVAS_H);
			return off.toDataURL('image/png');
		},
		clear() {
			clearAll();
		},
	}));

	function clearAll() {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.restore();
	}

	function getPos(e) {
		const c = canvasRef.current;
		const r = c.getBoundingClientRect();
		return {
			x: ((e.clientX - r.left) * CANVAS_W) / r.width,
			y: ((e.clientY - r.top) * CANVAS_H) / r.height,
		};
	}

	function drawSegment(a, b, pressure, pointerType) {
		const ctx = canvasRef.current.getContext('2d');
		ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
		ctx.strokeStyle = color;
		let w = tool === 'eraser' ? size * 2 : size;
		if (tool === 'pen' && pointerType === 'pen' && pressure > 0) {
			w = size * (0.5 + pressure); // 펜슬 필압 반영
		}
		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}

	function onPointerDown(e) {
		if (disabled) return;
		e.preventDefault();
		canvasRef.current.setPointerCapture(e.pointerId);
		drawing.current = true;
		const p = getPos(e);
		last.current = p;
		drawSegment(p, p, e.pressure, e.pointerType);
	}

	function onPointerMove(e) {
		if (!drawing.current || disabled) return;
		e.preventDefault();
		const native = e.nativeEvent;
		const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
		for (const ev of events.length ? events : [native]) {
			const p = getPos(ev);
			drawSegment(last.current, p, ev.pressure, ev.pointerType);
			last.current = p;
		}
	}

	function onPointerUp() {
		drawing.current = false;
		last.current = null;
	}

	return (
		<div className="flex flex-col gap-3 select-none">
			<canvas
				ref={canvasRef}
				className={`w-full bg-white rounded-xl border-2 border-slate-300 touch-none ${disabled ? 'opacity-60' : ''}`}
				style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, cursor: 'crosshair' }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onPointerLeave={onPointerUp}
				onContextMenu={(e) => e.preventDefault()}
			/>

			{/* 도구 모음 */}
			<div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setTool('pen')}
						className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}
						title="펜"
					>
						<Pencil size={22} />
					</button>
					<button
						type="button"
						onClick={() => setTool('eraser')}
						className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}
						title="지우개"
					>
						<Eraser size={22} />
					</button>
					<button
						type="button"
						onClick={() => { if (window.confirm('그림을 모두 지울까요?')) clearAll(); }}
						className="p-2 rounded-lg hover:bg-red-50 text-red-500"
						title="전체 지우기"
					>
						<Trash2 size={22} />
					</button>
				</div>

				<div className="w-px h-8 bg-slate-200 hidden sm:block" />

				<div className="flex items-center gap-1">
					{SIZES.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setSize(s)}
							className={`w-10 h-10 flex items-center justify-center rounded-lg ${size === s ? 'bg-blue-100' : 'hover:bg-slate-100'}`}
							title={`굵기 ${s}`}
						>
							<span className="rounded-full bg-slate-800" style={{ width: Math.min(s, 24), height: Math.min(s, 24) }} />
						</button>
					))}
				</div>

				<div className="w-px h-8 bg-slate-200 hidden sm:block" />

				<div className="flex items-center gap-1 flex-wrap">
					{COLORS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => { setColor(c); setTool('pen'); }}
							className={`w-9 h-9 rounded-full border-2 ${color === c && tool === 'pen' ? 'border-blue-600 scale-110' : 'border-white'} shadow-sm`}
							style={{ backgroundColor: c }}
							title={c}
						/>
					))}
				</div>
			</div>
		</div>
	);
});

export default DrawingCanvas;
