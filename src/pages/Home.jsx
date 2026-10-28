import { Link } from 'react-router-dom';
import { Presentation, Users, Palette } from 'lucide-react';

export default function Home() {
	return (
		<main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
			<div className="text-center">
				<Palette size={56} className="mx-auto text-blue-600 mb-3" />
				<h1 className="text-4xl font-extrabold">릴레이 그림 게임</h1>
				<p className="text-slate-500 mt-2">
					제시어 → 그림 → 맞히기, 우리 반이 함께 이어 그려요!
				</p>
			</div>
			<div className="grid gap-4 w-full max-w-md">
				<Link to="/teacher" className="btn-primary text-xl py-5">
					<Presentation /> 선생님 (방 만들기)
				</Link>
				<Link to="/play" className="btn-ghost text-xl py-5">
					<Users /> 학생 (코드로 입장)
				</Link>
			</div>
		</main>
	);
}
