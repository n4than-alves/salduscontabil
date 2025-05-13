
/// <reference types="vite/client" />

// Add Jest type declarations for testing
declare namespace jest {
  type Mock<T = any, Y extends any[] = any[]> = {
    (...args: Y): T;
    mockReturnThis(): Mock<T, Y>;
    mockReturnValue(val: T): Mock<T, Y>;
    mockResolvedValue(val: T): Mock<T, Y>;
  }
  
  function fn<T = any, Y extends any[] = any[]>(): Mock<T, Y>;
  function clearAllMocks(): void;
}
