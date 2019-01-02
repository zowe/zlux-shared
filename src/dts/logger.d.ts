export declare enum LogLevel {
    SEVERE = 0,
    WARNING = 1,
    INFO = 2,
    FINE = 3,
    FINER = 4,
    FINEST = 5
}
export declare class ComponentLogger implements ZLUX.ComponentLogger {
    private parentLogger;
    private componentName;
    SEVERE: number;
    WARNING: number;
    INFO: number;
    FINE: number;
    FINER: number;
    FINEST: number;
    constructor(parentLogger: Logger, componentName: string);
    makeSublogger(componentNameSuffix: string): ComponentLogger;
    log(minimumLevel: number, ...loggableItems: any[]): void;
    severe(...loggableItems: any[]): void;
    info(...loggableItems: any[]): void;
    warn(...loggableItems: any[]): void;
    debug(...loggableItems: any[]): void;
}
export declare class Logger implements ZLUX.Logger {
    private destinations;
    private configuration;
    private componentLoggers;
    private previousPatterns;
    private knownComponentNames;
    static SEVERE: number;
    static WARNING: number;
    static INFO: number;
    static FINE: number;
    static FINER: number;
    static FINEST: number;
    constructor();
    addDestination(destinationCallback: (componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]) => void): void;
    private shouldLogInternal;
    private consoleLogInternal;
    makeDefaultDestination(prependDate?: boolean, prependName?: boolean, prependLevel?: boolean): (x: string, y: LogLevel, z: string) => void;
    log(componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]): void;
    setLogLevelForComponentPattern(componentNamePattern: string, level: LogLevel): void;
    setLogLevelForComponentName(componentName: string, level: LogLevel | number): void;
    getComponentLevel(componentName: string): LogLevel;
    private noteComponentNameInternal;
    private replayPatternsOnLogger;
    makeComponentLogger(componentName: string): ComponentLogger;
}
