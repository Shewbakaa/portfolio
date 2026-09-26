import React from 'react';
import { SketchButton } from './SketchButton';

export const SketchEnterButton = ({ onClick, label = "let's go!" }) => (
  <SketchButton className="sketch-enter" label={label} onClick={onClick} arrow />
);
