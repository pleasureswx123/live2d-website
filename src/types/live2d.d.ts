/**
 * Live2D 相关类型定义
 */

declare global {
  interface Window {
    PIXI: any;
  }
}

declare module 'pixi-live2d-display' {
  export class Live2DModel {
    static from(source: string | object): Promise<Live2DModel>;
    
    internalModel: {
      coreModel: any;
      motionManager: {
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        stopAllMotions(): void;
        expressionManager?: {
          setExpression(name: string | null): void;
        };
      };
      settings: {
        expressions?: Array<{
          Name: string;
          File: string;
        }>;
        motions?: {
          [group: string]: Array<{
            File: string;
          }>;
        };
      };
    };
    
    scale: {
      set(value: number): void;
      x: number;
      y: number;
    };
    
    position: {
      set(x: number, y: number): void;
      x: number;
      y: number;
    };
    
    anchor: {
      set(x: number, y: number): void;
      x: number;
      y: number;
    };
    
    update(deltaTime: number): void;
    motion(group: string, index?: number, priority?: number): Promise<any>;
    expression(name: string | number | null): Promise<any> | void;
    destroy(): void;
    getBounds(): {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
  
  export enum MotionPriority {
    NONE = 0,
    IDLE = 1,
    NORMAL = 2,
    FORCE = 3
  }
  
  export class SoundManager {
    static volume: number;
  }
}

declare module 'pixi.js' {
  export interface Application {
    view: HTMLCanvasElement;
    stage: Container;
    ticker: Ticker;
    renderer: Renderer;
    destroy(removeView?: boolean): void;
  }
  
  export interface Container {
    addChild(child: any): any;
    removeChild(child: any): any;
  }
  
  export interface Ticker {
    add(fn: (deltaTime: number) => void): void;
    remove(fn: (deltaTime: number) => void): void;
    deltaMS: number;
  }
  
  export interface Renderer {
    resize(width: number, height: number): void;
  }
}

// 语音识别相关类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  
  interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start(): void;
    stop(): void;
  }
  
  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }
  
  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
  }
  
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    length: number;
    isFinal: boolean;
  }
  
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  
  interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
  }
}

export {};
