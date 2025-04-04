import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        id={chartId}
        className={cn('w-full h-full', className)}
        {...props}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(([key, value]) => {
                if (!value.color) return '';
                
                return `
                #${chartId} .recharts-layer.${key} {
                  --chart-color: ${value.color};
                  --chart-color-rgb: ${hexToRgb(value.color)};
                  --chart-color-a10: rgba(var(--chart-color-rgb), 0.1);
                  --chart-color-a20: rgba(var(--chart-color-rgb), 0.2);
                  --chart-color-a40: rgba(var(--chart-color-rgb), 0.4);
                }
              `;
              })
              .join(''),
          }}
        />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

// Export basic chart components that can be used if needed
export const Chart = RechartsPrimitive.ResponsiveContainer;
export const ChartLine = RechartsPrimitive.Line;
export const ChartBar = RechartsPrimitive.Bar;
export const ChartArea = RechartsPrimitive.Area;
export const ChartXAxis = RechartsPrimitive.XAxis;
export const ChartYAxis = RechartsPrimitive.YAxis;
export const ChartTooltip = RechartsPrimitive.Tooltip;
export const ChartLegend = RechartsPrimitive.Legend;
export const ChartCartesianGrid = RechartsPrimitive.CartesianGrid;

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

export {
  ChartContainer,
  useChart
};
