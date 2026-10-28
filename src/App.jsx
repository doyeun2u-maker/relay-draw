import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TeacherPage from './pages/TeacherPage.jsx';
import StudentPage from './pages/StudentPage.jsx';

// HashRouter: GitHub Pages는 정적 호스팅이라 /teacher 로 새로고침하면 404가 납니다.
// 해시 라우팅(#/teacher)은 항상 index.html을 불러오므로 문제가 없습니다.
export default function App() {
	return (
		<HashRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/teacher" element={<TeacherPage />} />
				<Route path="/play" element={<StudentPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</HashRouter>
	);
}
