import Lottie from "lottie-react";
import { useEffect, useState } from "react";

export default function LottiePlayer({ animationData, animationPath, width = "100%", height = "100%" }) {
  const [data, setData] = useState(animationData);

  useEffect(() => {
    if (!animationData && animationPath) {
      fetch(animationPath)
        .then((res) => res.json())
        .then((resData) => setData(resData))
        .catch((err) => console.error("Error loading lottie animation:", err));
    } else if (animationData) {
      setData(animationData);
    }
  }, [animationPath, animationData]);

  if (!data) return <div style={{ width, height }}></div>;

  const LottieComponent = Lottie?.default || Lottie;

  return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {LottieComponent && (
        <LottieComponent 
          animationData={data} 
          loop={true} 
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}
