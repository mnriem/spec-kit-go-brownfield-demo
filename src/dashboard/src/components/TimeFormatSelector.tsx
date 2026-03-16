import React from 'react';
import { TimeFormat } from '@gov.nasa.jpl.hermes/types';

interface TimeFormatSelectorProps {
    value: TimeFormat;
    onChange: (format: TimeFormat) => void;
}

export function TimeFormatSelector({ value, onChange }: TimeFormatSelectorProps) {
    return (
        <select
            className="time-format-selector"
            value={value}
            onChange={(e) => onChange(e.target.value as TimeFormat)}
        >
            <option value={TimeFormat.UTC}>UTC</option>
            <option value={TimeFormat.LOCAL}>Local</option>
            <option value={TimeFormat.SCLK}>SCLK</option>
        </select>
    );
}
