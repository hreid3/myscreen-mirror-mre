/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from "@microsoft/mixed-reality-extension-sdk";
import debounce from "lodash.debounce";
import block from "./block";
import {ParameterSet} from "@microsoft/mixed-reality-extension-sdk";
type ScreenType = '3D' | '2D';
type MyScreenUser = MRE.User;
type MyScreenContext = MRE.Context & {
	screen3D?: MRE.Actor;
	screen2D?: MRE.Actor;
	activeScreen?: ScreenType;
}
const artifactMirror3D = '1950382508075909619';
const artifactMirror2D = '1967030398777033187'

const screenTypeMapping: Record<ScreenType, string> = {
	"3D": artifactMirror3D,
	"2D": artifactMirror2D,
}

/**
 * The main class of this Index. All the logic goes here.
 */
export default class App {
	private assets: MRE.AssetContainer;
	private ignoreClicks = false;
	private initialized = false;

	constructor(private context: MyScreenContext, private parameterSet: MRE.ParameterSet) {
		console.log(this.context.sessionId, "constructed");
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted( () => this.started(parameterSet));
		this.context.onStopped(this.stopped);
		this.context.onUserLeft( (user) => this.handleUserLeft(user));
		this.context.onUserJoined(async (user) => await this.handleUserJoined(user));
	}

	private handleUserJoined = async (user: MyScreenUser) => {
		if (!this.initialized) {
			await block(() => this.initialized, 15000);
		}
		this.attachBehaviors();
	}
	private debounceClick = (callbackFn: any) => debounce(callbackFn, 1000, {
		leading: true, trailing: false
	});
	private attachBehaviors = () => {
		if (this.context.activeScreen === "2D") {
			this.context.screen3D.setBehavior(MRE.ButtonBehavior).onClick(this.debounceClick(this.handleScreenClicked))
			this.context.screen2D.setBehavior(null);
		} else {
			this.context.screen2D.setBehavior(MRE.ButtonBehavior).onClick(this.debounceClick(this.handleScreenClicked))
			this.context.screen3D.setBehavior(null);
		}
	}
	private activate3DScreen = () => {
		this.context.activeScreen = '3D';
		this.context.screen3D.appearance.enabled = true;
		this.context.screen2D.appearance.enabled = false;
		this.attachBehaviors();
		console.log(this.context.sessionId, "Showing Screen:", this.context.activeScreen)
	}
	private activate2DScreen = () => {
		this.context.activeScreen = '2D';
		this.context.screen3D.appearance.enabled = false;
		this.context.screen2D.appearance.enabled = true;
		this.attachBehaviors();
		console.log(this.context.sessionId, "Showing Screen:", this.context.activeScreen)
	}
	private handleScreenClicked = () => {
		if (this.context.activeScreen === "3D") {
			this.activate2DScreen();
		} else {
			this.activate3DScreen();
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private getMirror = async (screenType: ScreenType) => {
		const lib = MRE.Actor.CreateFromLibrary(this.context, {
			resourceId: `artifact:${screenTypeMapping[screenType]}`,
			actor: {
				name: `mirror-${screenType}`,
				appearance: {enabled: false,},
				collider: {geometry: {shape: MRE.ColliderType.Box},},
			}
		});
		return lib;
	}
	private handleUserLeft = (user: MyScreenUser) => {
	};

	private started = async (params: ParameterSet) => {
		console.log(this.context.sessionId, "App Started");
		this.context.screen2D = await this.getMirror("2D");
		this.context.screen3D = await this.getMirror( "3D");
		this.context.activeScreen = (params?.screen || process.env.screen || '3D') as ScreenType
		console.log(this.context.sessionId, "Default Screen:", this.context.activeScreen)
		if (this.context.activeScreen === "2D") {
			this.activate2DScreen();
		} else {
			this.activate3DScreen();
		}
		this.initialized = true;
	};

	private stopped = () => {
		this.context.screen3D?.setBehavior(null);
		this.context.screen3D?.destroy();
		this.context.screen3D = undefined;
		this.context.screen2D?.setBehavior(null);
		this.context.screen2D?.destroy();
		this.context.screen2D = undefined;
		console.log(this.context.sessionId, "App Stopped");
	};
}
