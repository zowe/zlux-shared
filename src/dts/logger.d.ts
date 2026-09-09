declare type MessageTable = any;
export declare enum LogLevel {
    CRITICAL = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    FINER = 4,
    TRACE = 5
}
export declare class ComponentLogger implements ZLUX.ComponentLogger {
    private parentLogger;
    private componentName;
    private _messages;
    private _subLoggers;
    SEVERE: number;
    CRITICAL: number;
    WARN: number;
    WARNING: number;
    INFO: number;
    FINE: number;
    DEBUG: number;
    FINER: number;
    FINEST: number;
    TRACE: number;
    constructor(parentLogger: Logger, componentName: string, messages?: MessageTable);
    _setMessages(table: MessageTable): void;
    makeSublogger(componentNameSuffix: string): ComponentLogger;
    /**
     * Expands a message ID into "<id> - <message table text>" when the first loggable
     * item names an entry in this logger's message table.
     *
     * The lookup is restricted to own properties so that inherited Object members
     * ('constructor', 'toString', ...) cannot be mistaken for message definitions.
     */
    private applyMessageTable;
    log(minimumLevel: number, ...loggableItems: any[]): void;
    severe(...loggableItems: any[]): void;
    critical(...loggableItems: any[]): void;
    info(...loggableItems: any[]): void;
    warn(...loggableItems: any[]): void;
    debug(...loggableItems: any[]): void;
    trace(...loggableItems: any[]): void;
}
export declare class Logger implements ZLUX.Logger {
    private destinations;
    private configuration;
    private previousPatterns;
    private knownComponentNames;
    static SEVERE: number;
    static CRITICAL: number;
    static WARNING: number;
    static WARN: number;
    static INFO: number;
    static DEBUG: number;
    static FINE: number;
    static FINER: number;
    static FINEST: number;
    static TRACE: number;
    private static processString;
    private static processStringPrefix;
    private static username;
    private static euid?;
    private static os?;
    private static offsetMs;
    private static seperator;
    private static useV8Tracing;
    private static nodeUtil;
    /**
     * C0 control characters plus DEL, excluding TAB (\x09) and LF (\x0A).
     * Escaping these stops ANSI/terminal escape sequences and lone CRs from reaching
     * an operator's terminal or overwriting part of a written record.
     */
    private static controlCharacters;
    /**
     * Prepended to every continuation line of a record. Log readers - including the
     * Zowe service logging standard in zowe-install-packaging bin/libs/common - treat
     * a line as a new, already-formatted record only when it begins with a timestamp.
     * Marking continuations guarantees no embedded newline can forge a record.
     */
    private static continuationPrefix;
    constructor(offsetMs?: number);
    private updateProcessString;
    toggleV8Tracing(): boolean;
    _setBrowserUsername(username: string): void;
    addDestination(destinationCallback: (componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]) => void): void;
    private shouldLogInternal;
    private static createPrependingStrings;
    /**
     * Replaces control characters with printable escapes, leaving TAB and LF intact.
     * LF is preserved here so that legitimately multi-line content (message table
     * entries, error stacks) still renders across lines; it is neutralized later by
     * the continuation prefix applied to the finished record.
     */
    private static escapeControlCharacters;
    private static sanitizeLoggableItem;
    /**
     * Sanitizes a value used inside the record prefix. Component names can come from
     * request parameters, so they must not be able to introduce line breaks.
     */
    private static sanitizeToken;
    private static stringifyValue;
    /**
     * Minimal util.format stand-in for browsers, where the node 'util' module is absent.
     */
    private static formatWithoutNode;
    private static formatLoggableItems;
    private consoleLogInternal;
    makeDefaultDestination(prependDate?: boolean, prependName?: boolean, prependLevel?: boolean, prependProcess?: boolean, prependUser?: boolean, processStringPrefix?: string): (x: string, y: LogLevel, z: string) => void;
    log(componentName: string, minimumLevel: LogLevel, ...loggableItems: any[]): void;
    setLogLevelForComponentPattern(componentNamePattern: string, level: LogLevel): void;
    setLogLevelForComponentName(componentName: string, level: LogLevel | number): void;
    getComponentLevel(componentName: string): LogLevel;
    getConfig(): any;
    private noteComponentNameInternal;
    private replayPatternsOnLogger;
    makeComponentLogger(componentName: string, _messages?: MessageTable): ComponentLogger;
}
export {};
