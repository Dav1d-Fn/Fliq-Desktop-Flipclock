import { Menu } from "@mantine/core";
import { IconAdjustments, IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react";

interface MemberMenuProps
{
    // Where the right-click was, in px inside the canvas.
    x: number;
    y: number;
    index: number;
    count: number;
    onMove: (step: number) => void;
    onDetach: () => void;
    onSettings: () => void;
    onClose: () => void;
}

// Right-click menu for one member of a group on the canvas.
export function MemberMenu({ x, y, index, count, onMove, onDetach, onSettings, onClose }: MemberMenuProps)
{
    return (
        <Menu opened onChange={(opened) => !opened && onClose()} position="bottom-start" offset={2} withinPortal={false} shadow="md" width={190}>
            <Menu.Target>
                <div className="member-menu-anchor" style={{ left: x, top: y }} />
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<IconArrowLeft size={15} />} disabled={index === 0} closeMenuOnClick={false} onClick={() => onMove(-1)}>
                    Move left
                </Menu.Item>
                <Menu.Item leftSection={<IconArrowRight size={15} />} disabled={index === count - 1} closeMenuOnClick={false} onClick={() => onMove(1)}>
                    Move right
                </Menu.Item>
                <Menu.Item leftSection={<IconAdjustments size={15} />} onClick={onSettings}>
                    Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconX size={15} />} color="red" onClick={onDetach}>
                    Remove from group
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
