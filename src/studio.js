import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {TransformControls} from 'three/addons/controls/TransformControls.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {STLLoader} from 'three/addons/loaders/STLLoader.js'
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js'
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js'
import {EQUIPMENT_CATEGORIES, buildEquipment} from './equipment'

export const categories = EQUIPMENT_CATEGORIES

export async function assetModel(asset) {
    let root
    if (asset.builtin) {
        root = buildEquipment(asset.type || ({
            stacker: 'stacker',
            rack: 'rack',
            conveyor: 'roller',
            pallet: 'pallet'
        }[asset.category]))
    } else if (asset.ext === 'glb' || asset.ext === 'gltf') {
        root = (await new GLTFLoader().parseAsync(asset.buffer, '')).scene
    } else if (asset.ext === 'stl') {
        root = new THREE.Mesh(new STLLoader().parse(asset.buffer), new THREE.MeshStandardMaterial({
            color: '#adbfc8',
            metalness: .4,
            roughness: .45
        }))
    } else if (asset.ext === 'obj') {
        root = new OBJLoader().parse(new TextDecoder().decode(asset.buffer))
    } else if (asset.ext === 'svg' && asset.svg) {
        const parsed = new SVGLoader().parse(asset.svg)
        root = new THREE.Group()
        for (const path of parsed.paths) {
            const style = path.userData.style || {}
            if (style.fill && style.fill !== 'none') {
                const material = new THREE.MeshStandardMaterial({color: style.fill, roughness: .62, side: THREE.DoubleSide})
                for (const shape of SVGLoader.createShapes(path)) {
                    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {depth: .04, bevelEnabled: false}), material)
                    mesh.scale.y = -1
                    root.add(mesh)
                }
            }
            if (style.stroke && style.stroke !== 'none') {
                const material = new THREE.MeshStandardMaterial({color: style.stroke, roughness: .62, side: THREE.DoubleSide})
                for (const subPath of path.subPaths) {
                    const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), {strokeColor: style.stroke, strokeWidth: Number(style.strokeWidth) || 2, strokeLineJoin: style.strokeLinejoin, strokeLineCap: style.strokeLinecap, strokeMiterLimit: Number(style.strokeMiterlimit) || 4})
                    if (geometry) {
                        const mesh = new THREE.Mesh(geometry, material)
                        mesh.scale.y = -1
                        root.add(mesh)
                    }
                }
            }
        }
        const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3())
        const factor = 2.5 / Math.max(size.x, size.y, .001)
        root.scale.setScalar(factor)
        root.rotation.x = -Math.PI / 2
    } else throw Error('不支持的模型格式')
    const group = new THREE.Group();
    group.add(root);
    if (asset.ext !== 'svg') root.scale.setScalar(asset.units === 'mm' ? .001 : 1);
    root.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(root);
    if (bounds.isEmpty() || !Number.isFinite(bounds.max.x)) throw Error('模型中没有可显示的几何体')
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -bounds.min.y, -center.z);
    return group
}

export function createStudio(container, onSelection, onChange) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091724');
    const camera = new THREE.PerspectiveCamera(45, 1, .01, 2000);
    camera.position.set(24, 20, 28)
    const renderer = new THREE.WebGLRenderer({antialias: true});
    container.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe4f5ff, 0x34404e, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(10, 25, 10);
    scene.add(light);
    scene.add(new THREE.GridHelper(100, 100, 0x2e807e, 0x203744))
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.target.set(0, 2, 0)
    const transform = new TransformControls(camera, renderer.domElement);
    scene.add(transform.getHelper());
    transform.setTranslationSnap(.5);
    transform.addEventListener('dragging-changed', e => orbit.enabled = !e.value);
    transform.addEventListener('objectChange', () => {
        const o = transform.object;
        if (o) {
            onSelection(snapshot(o));
            onChange(list())
        }
    })
    const objects = new Map();
    let frame, down, disposed = false;
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const snapshot = o => ({
        id: o.userData.id,
        assetId: o.userData.assetId,
        name: o.userData.name,
        position: o.position.toArray(),
        rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
        scale: o.scale.toArray(),
        bounds: o.userData.bounds
    })
    const list = () => [...objects.values()].map(snapshot)
    const resize = () => {
        const r = container.getBoundingClientRect();
        if (!r.width || !r.height) return;
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2, Math.sqrt(2500000 / (r.width * r.height))));
        renderer.setSize(r.width, r.height)
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize()
    const animate = () => {
        frame = requestAnimationFrame(animate);
        if (container.clientWidth && container.clientHeight) {
            orbit.update();
            renderer.render(scene, camera)
        }
    };
    animate()
    const coords = (x, y) => {
        const r = renderer.domElement.getBoundingClientRect();
        pointer.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
        ray.setFromCamera(pointer, camera)
    }
    const select = id => {
        const o = objects.get(id);
        if (o) {
            transform.attach(o);
            onSelection(snapshot(o))
        } else {
            transform.detach();
            onSelection(null)
        }
    }
    const click = e => {
        if (transform.dragging || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
        coords(e.clientX, e.clientY);
        const hit = ray.intersectObjects([...objects.values()], true)[0];
        if (hit) {
            let o = hit.object;
            while (o && !o.userData.id) o = o.parent;
            if (o) select(o.userData.id)
        }
    }
    const pointerDown = e => down = [e.clientX, e.clientY];
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', click)
    const release = o => o.traverse(n => {
        n.geometry?.dispose();
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => {
            if (m) {
                for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
                m.dispose()
            }
        })
    })
    return {
        list, select, async add(asset, placement = {}, drop) {
            const o = await assetModel(asset);
            if (disposed) {
                release(o);
                return
            }
            const dimensions = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray();
            o.userData = {
                bounds: dimensions,
                id: placement.id || THREE.MathUtils.generateUUID(),
                assetId: asset.id,
                name: placement.name || asset.name
            };
            if (placement.position) o.position.fromArray(placement.position); else if (drop) {
                coords(drop.x, drop.y);
                const point = new THREE.Vector3();
                if (ray.ray.intersectPlane(plane, point)) o.position.copy(point)
            }
            if (placement.rotation) o.rotation.set(...placement.rotation);
            if (placement.scale) o.scale.fromArray(placement.scale);
            scene.add(o);
            objects.set(o.userData.id, o);
            select(o.userData.id);
            onChange(list());
            return snapshot(o)
        }, update(id, data) {
            const o = objects.get(id);
            if (!o) return;
            if (data.position) o.position.fromArray(data.position);
            if (data.rotation) o.rotation.set(...data.rotation);
            if (data.scale) o.scale.fromArray(data.scale);
            onSelection(snapshot(o));
            onChange(list())
        }, frameAll() {
            if (!objects.size) return;
            const bounds = new THREE.Box3();
            objects.forEach(o => bounds.union(new THREE.Box3().setFromObject(o)));
            const center = bounds.getCenter(new THREE.Vector3()),
                radius = bounds.getSize(new THREE.Vector3()).length() / 2;
            const r = container.getBoundingClientRect(), aspect = r.width / Math.max(r.height, 1);
            const fov = Math.min(camera.fov * Math.PI / 180, 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * aspect));
            const distance = Math.max(radius / Math.sin(fov / 2) * 1.2, 5);
            orbit.target.copy(center);
            camera.position.copy(center).add(new THREE.Vector3(1, .8, 1.2).normalize().multiplyScalar(distance))
        }, mode: v => transform.setMode(v), snap: v => transform.setTranslationSnap(v ? .5 : null), remove(id) {
            const o = objects.get(id);
            if (o) {
                transform.detach();
                scene.remove(o);
                objects.delete(id);
                release(o);
                onSelection(null);
                onChange(list())
            }
        }, focus(id) {
            const o = objects.get(id);
            if (!o) return;
            const box = new THREE.Box3().setFromObject(o), center = box.getCenter(new THREE.Vector3()),
                size = box.getSize(new THREE.Vector3()).length();
            orbit.target.copy(center);
            camera.position.copy(center).add(new THREE.Vector3(1, .8, 1.2).normalize().multiplyScalar(Math.max(size * 1.5, 4)))
        }, dispose() {
            disposed = true;
            cancelAnimationFrame(frame);
            observer.disconnect();
            orbit.dispose();
            transform.dispose();
            scene.traverse(n => {
                n.geometry?.dispose()
            });
            objects.forEach(release);
            renderer.dispose();
            renderer.domElement.remove()
        }
    }
}

export async function modelDB() {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open('warehouse-model-library', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('assets', {keyPath: 'id'});
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error)
    })
}

export async function dbCall(db, method, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('assets', method === 'getAll' ? 'readonly' : 'readwrite'),
            r = tx.objectStore('assets')[method](value);
        let result;
        r.onsuccess = () => result = r.result;
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || Error('本地保存失败'))
    })
}
