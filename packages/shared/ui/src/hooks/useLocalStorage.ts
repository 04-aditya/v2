import { useState, useEffect } from "react";

const getLocalValue = <T>(key: string, initValue: T) => {
    //SSR Next.js
    if (typeof window === 'undefined') return initValue;

    if (!key) throw new Error('useLocalStorage key may not be falsy');
    // if a value is already store
    const localValue = JSON.parse(localStorage.getItem(key)||'null') as T;
    if (localValue) return localValue;

    // return result of a function
    // if (initValue instanceof Function) return initValue();

    return initValue;
}

const useLocalStorage = <T>(key:string, initValue:T) => {
    const [value, setValue] = useState<T>(initValue);

    useEffect(() => {
      const storedValue:T = getLocalValue(key, initValue);
      setValue(storedValue);
    }, [key, initValue]);

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value])

    return [value, setValue];
}

export default useLocalStorage
