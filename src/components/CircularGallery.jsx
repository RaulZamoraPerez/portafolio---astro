import { useEffect, useRef } from 'react';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture, Vec2, Vec3 } from 'ogl';

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uBend;
  uniform float uSplay;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Calculate distance from center for bending effect
    float dist = position.x * uBend;
    pos.z += pow(dist, 2.0);
    
    // Slight splay/rotation based on x position
    pos.z += abs(position.x) * uSplay;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(tMap, vUv);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`;

export default function CircularGallery({
  items = [],
  bend = 1,
  textColor = "#ffffff",
  borderRadius = 0.05,
  scrollSpeed = 1,
  scrollEase = 0.05,
  uSplay = 0.0,
}) {
  const containerRef = useRef();
  const mouse = useRef(new Vec2());
  const scroll = useRef({
    current: 0,
    target: 0,
    last: 0,
    wheel: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;
    containerRef.current.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 35 });
    camera.position.z = 5;

    const scene = new Transform();
    const planeGeometry = new Plane(gl, {
      width: 1.5,
      height: 1,
      widthSegments: 20,
      heightSegments: 10,
    });

    const group = new Transform();
    group.setParent(scene);

    const meshes = [];
    const itemWidth = 2.0; // Spacing between items
    const totalWidth = items.length * itemWidth;

    items.forEach((item, i) => {
      const texture = new Texture(gl, {
        generateMipmaps: false,
      });
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = item.image || `https://picsum.photos/id/${i + 10}/800/600`;
      image.onload = () => {
        texture.image = image;
      };

      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          tMap: { value: texture },
          uBend: { value: bend },
          uSplay: { value: uSplay },
          uOpacity: { value: 0 },
        },
        transparent: true,
      });

      const mesh = new Mesh(gl, { geometry: planeGeometry, program });
      mesh.position.x = i * itemWidth;
      mesh.setParent(group);
      
      // Animate entry
      setTimeout(() => {
        let opacity = 0;
        const fadeIn = () => {
          opacity += 0.05;
          program.uniforms.uOpacity.value = opacity;
          if (opacity < 1) requestAnimationFrame(fadeIn);
        };
        fadeIn();
      }, i * 100);

      meshes.push({
        mesh,
        program,
        index: i,
      });
    });

    const onWheel = (e) => {
      scroll.current.target += e.deltaY * 0.002 * scrollSpeed;
    };

    let isDragging = false;
    let startX = 0;

    const onTouchStart = (e) => {
      isDragging = true;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = (x - startX) * 0.005 * scrollSpeed;
      scroll.current.target -= dx;
      startX = x;
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    window.addEventListener('wheel', onWheel);
    window.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    const resize = () => {
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
    };

    window.addEventListener('resize', resize);
    resize();

    let raf;
    const update = () => {
      scroll.current.current = lerp(scroll.current.current, scroll.current.target, scrollEase);
      
      const s = scroll.current.current;
      
      meshes.forEach((obj, i) => {
        let x = (i * itemWidth - s) % totalWidth;
        
        // Endless loop logic
        if (x < -totalWidth / 2) x += totalWidth;
        if (x > totalWidth / 2) x -= totalWidth;
        
        obj.mesh.position.x = x;
        
        // Dynamic bend based on position
        // obj.program.uniforms.uBend.value = bend * (1.0 - Math.abs(x) * 0.1);
      });

      renderer.render({ scene, camera });
      raf = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousedown', onTouchStart);
      window.removeEventListener('mousemove', onTouchMove);
      window.removeEventListener('mouseup', onTouchEnd);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      if (containerRef.current) {
        containerRef.current.removeChild(gl.canvas);
      }
    };
  }, [items, bend, scrollEase, scrollSpeed, uSplay]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        cursor: 'grab',
        overflow: 'hidden'
      }} 
    />
  );
}
