import type { Awareness } from "@notux/sync";
import { Group, Label, Layer, Line, Tag, Text } from "react-konva";
import { useRemoteCursors } from "../hooks/useRemoteCursors";
import type { ViewportState } from "../viewport/Viewport";

interface Props {
  awareness: Awareness | null;
  viewport: ViewportState;
}

// A classic pointer-arrow glyph, drawn in cursor-local coordinates.
const ARROW_POINTS = [0, 0, 0, 16, 4, 12, 7, 18, 10, 17, 7, 11, 12, 11];

// Renders remote collaborators' cursors and name tags. Non-interactive overlay
// mounted above all content. Cursor positions are world coords (the Stage is
// already viewport-transformed), and the glyph is counter-scaled by 1/scale so
// it stays a constant size on screen regardless of zoom.
export function PresenceLayer({ awareness, viewport }: Props) {
  const cursors = useRemoteCursors(awareness);
  const inv = 1 / viewport.scale;

  return (
    <Layer listening={false}>
      {cursors.map((c) => {
        if (!c.cursor) return null;
        return (
          <Group key={c.clientID} x={c.cursor.x} y={c.cursor.y} scaleX={inv} scaleY={inv}>
            <Line
              points={ARROW_POINTS}
              closed
              fill={c.color}
              stroke="white"
              strokeWidth={1}
              lineJoin="round"
            />
            <Label x={14} y={10}>
              <Tag fill={c.color} cornerRadius={4} />
              <Text
                text={c.name}
                fontSize={12}
                fontStyle="600"
                fill="white"
                padding={4}
              />
            </Label>
          </Group>
        );
      })}
    </Layer>
  );
}
