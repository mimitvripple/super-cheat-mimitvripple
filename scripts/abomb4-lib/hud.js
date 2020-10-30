
/*
配置项定义：
interface FragConfig {
    rows: number;               // 有几行
    columns: number;            // 有几列
    categories: FragCategory[]; // 分类信息
}
interface FragCategory {
    icon: () => TextureRegionDrawable;  // 图标获取函数，如 () => Icon.warning
    blocks: Block[];                    // 该分类包含的方块列表
}
 */

/**
 * 创建一个左下角的额外分类窗口，需要自定义分类。
 *
 * rows: 4
 * columns: 6
 * categories: 7 elements
 *
 * +------------------------------------+
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | |  |  |  |  |  |  |  |  |  |  |  | |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | |  |  |  |  |  |  |  |  |  |  |  | |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | |  |  |  |  |  |  |  |  |  |  |  | |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | |  |  |  |  |  |  |  |  |  |  |  | |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * |------------------------------------|
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | |  |  |  |  |  |  |  |  |  |  |  | |
 * | +--+  +--+  +--+  +--+  +--+  +--+ |
 * | +--+                               |
 * | |  |                               |
 * | +--+                               |
 * +------------------------------------+
 *
 * @param {FragConfig} 配置项
 */
var leftFrag = (fragConfig) => {
    // TODO validate fragConfig
    const iconWidth = 46;
    const padding = 4;

    var currentCategory = 0;
    var menuHoverBlock;
    var selectedBlocks = new ObjectMap();
    var scrollPositions = new ObjectFloatMap();
    var blockTable;
    var blockPane;
    var toggler;

    /** 判断某个方块类型是不是属于左下角 */
    function containsContent(content) {
        var found = false;
        var cs = fragConfig.categories;
        loop: for (var i = 0; i < cs.length; i++) {
            var category = cs[i];
            for (var j = 0; j < category.blocks.length; j++) {
                var block = category.blocks[j];
                if (content == block) {
                    found = true;
                    break loop;
                }
            }
        }

        return found;
    }
    Events.on(UnlockEvent, cons(event => {
        if (containsContent(event.content)) {
            rebuild();
        }
    }));

    function unlocked(block) {
        return block.unlockedNow();
    }
    function getSelectedBlock(cat) {
        return selectedBlocks.get(cat, prov(() => {
            var category = fragConfig.categories(cat)
            return category.blocks.find(v => unlocked(v));
        }));
    }
    return new JavaAdapter(Fragment, {
        build(parent) {
            parent.fill(cons(full => {
                toggler = full;
                full.bottom().left().visibility = boolp(() => Vars.ui.hudfrag.shown);

                full.table(cons(frame => {

                    var rebuildCategory = run(() => {

                        blockTable.clear();
                        blockTable.top().margin(5);

                        var index = 0;
                        var group = new ButtonGroup();
                        group.setMinCheckCount(0);

                        var category = fragConfig.categories[currentCategory || 0];
                        for (var j = 0; j < category.blocks.length; j++) {
                            var block = ((sss) => category.blocks[sss])(j);
                            if (!unlocked(block)) { continue; }
                            if (index++ % fragConfig.columns == 0) {
                                blockTable.row();
                            }

                            var button = blockTable.button(new TextureRegionDrawable(block.icon(Cicon.medium)), Styles.selecti, run(() => {
                                if (unlocked(block)) {
                                    if (Core.input.keyDown(Packages.arc.input.KeyCode.shiftLeft) && Fonts.getUnicode(block.name) != 0) {
                                        Core.app.setClipboardText(Fonts.getUnicode(block.name) + "");
                                        Vars.ui.showInfoFade("@copied");
                                    } else {
                                        Vars.control.input.block = Vars.control.input.block == block ? null : block;
                                        selectedBlocks.put(currentCategory, Vars.control.input.block);
                                    }
                                }
                            })).size(iconWidth).group(group).name("block-" + block.name).get();
                            button.resizeImage(Cicon.medium.size);

                            button.update(run(() => {
                                var core = Vars.player.core();
                                var color = (Vars.state.rules.infiniteResources
                                    || (core != null && (core.items.has(block.requirements, Vars.state.rules.buildCostMultiplier) || Vars.state.rules.infiniteResources)))
                                    && Vars.player.isBuilder() ? Color.white : Color.gray;

                                button.forEach(cons(elem => { elem.setColor(color); }));
                                button.setChecked(Vars.control.input.block == block);

                                if (!block.isPlaceable()) {
                                    button.forEach(cons(elem => elem.setColor(Color.darkGray)));
                                }

                                button.hovered(run(() => menuHoverBlock = block));
                                button.exited(run(() => {
                                    if (menuHoverBlock == block) {
                                        menuHoverBlock = null;
                                    }
                                }));
                            }));

                            //add missing elements to even out table size
                            if (index < fragConfig.columns) {
                                for (var k = 0; k < fragConfig.columns - index; k++) {
                                    blockTable.add().size(iconWidth);
                                }
                            }
                            blockTable.act(0);
                            blockPane.setScrollYForce(scrollPositions.get(currentCategory, 0));
                            Core.app.post(() => {
                                blockPane.setScrollYForce(scrollPositions.get(currentCategory, 0));
                                blockPane.act(0);
                                blockPane.layout();
                            });
                        }

                    });

                    frame.image().color(Pal.gray).colspan(fragConfig.columns).height(padding).growX();
                    frame.row();
                    frame.table(Tex.pane2, cons(blocksSelect => {
                        blocksSelect.margin(padding).marginTop(0);
                        blockPane = blocksSelect.pane(cons(blocks => blockTable = blocks)).height(iconWidth * fragConfig.rows + padding)
                            .update(cons(pane => {
                                if (pane.hasScroll()) {
                                    var result = Core.scene.hit(Core.input.mouseX(), Core.input.mouseY(), true);
                                    if (result == null || !result.isDescendantOf(pane)) {
                                        Core.scene.setScrollFocus(null);
                                    }
                                }
                            })).grow().get();
                        blockPane.setStyle(Styles.smallPane);
                        blocksSelect.row();
                        blocksSelect.table(cons(table => {

                            table.image().color(Pal.gray).height(padding).colspan(fragConfig.columns).growX();
                            table.row();
                            table.left().margin(0).defaults().size(iconWidth).left();

                            var group = new ButtonGroup();
                            var index = 0;
                            var cs = fragConfig.categories;
                            for (var i = 0; i < cs.length; i++) {
                                if (index++ % fragConfig.columns == 0) {
                                    table.row();
                                }
                                var category = cs[i];
                                (cc => {
                                    table.button(category.icon(), Styles.clearToggleTransi, run(() => {
                                        currentCategory = cc;
                                        if (Vars.control.input.block != null) {
                                            Vars.control.input.block = getSelectedBlock(currentCategory);
                                        }
                                        rebuildCategory.run();
                                    })).group(group).update(cons(v => v.setChecked(currentCategory == v))).name("category-" + cc);
                                })(i);
                            }
                            //add missing elements to even out table size
                            if (index < fragConfig.columns) {
                                for (var k = 0; k < fragConfig.columns - index; k++) {
                                    table.add().size(iconWidth);
                                }
                            }
                        })).name("inputTable").growX();
                    })).fillY().bottom().touchable(Touchable.enabled);

                    rebuildCategory.run();
                    // frame.update(() -> {
                    //     if(gridUpdate(control.input)) rebuildCategory.run();
                    // });
                }));

            }));
        },
    });
};

Events.on(ClientLoadEvent, cons((e) => {
    var frag = leftFrag({
        rows: 3,
        columns: 3,
        categories: [
            { icon: () => Icon.warning, blocks: [Blocks.duo] },
            { icon: () => Icon.power, blocks: [Blocks.rtgGenerator] },
            { icon: () => Icon.power, blocks: [Blocks.rtgGenerator] },
            { icon: () => Icon.power, blocks: [Blocks.rtgGenerator] },
        ]
    });
    frag.build(Vars.ui.hudGroup);
}));