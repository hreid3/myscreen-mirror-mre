/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from "@microsoft/mixed-reality-extension-sdk";
import debounce from "lodash.debounce";
import block from "./block";
type ScreenType = '3D' | '2D';
type MyScreenUser = MRE.User & {
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

	constructor(private context: MRE.Context, private parameterSet: MRE.ParameterSet) {
		console.log("constructed", this.context.sessionId);
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted( () => this.started());
		this.context.onStopped(this.stopped);
		this.context.onUserLeft( (user) => this.handleUserLeft(user));
		this.context.onUserJoined(async (user) => await this.handleUserJoined(user));
	}

	private handleUserJoined = async (user: MyScreenUser) => {
		if (!this.initialized) {
			await block(() => this.initialized, 15000);
		}
		// We need to setup the screens
		user.screen2D = await this.getMirror(user, "2D");
		user.screen3D = await this.getMirror(user, "3D");
		this.activate3DScreen(user);
		// turn on the default
	};
	private debounceClick = (callbackFn: any) => debounce(callbackFn, 1000, {
		leading: true, trailing: false
	});
	private activate3DScreen = (user: MyScreenUser) => {
		user.activeScreen = '3D';
		user.screen3D.appearance.enabled = true;
		user.screen3D.setBehavior(MRE.ButtonBehavior).onClick(this.debounceClick(this.handleScreenClicked))
		user.screen2D.appearance.enabled = false;
		user.screen2D.setBehavior(null);
	}
	private activate2DScreen = (user: MyScreenUser) => {
		user.activeScreen = '2D';
		user.screen3D.appearance.enabled = false;
		user.screen2D.setBehavior(MRE.ButtonBehavior).onClick(this.debounceClick(this.handleScreenClicked))
		user.screen3D.setBehavior(null);
		user.screen2D.appearance.enabled = true;
	}
	private handleScreenClicked = (user: MyScreenUser) => {
		if (user.activeScreen === "3D") {
			this.activate2DScreen(user);
		} else {
			this.activate3DScreen(user);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private getMirror = async (user: MyScreenUser, screenType: ScreenType) => {
		const lib = MRE.Actor.CreateFromLibrary(this.context, {
			resourceId: `artifact:${screenTypeMapping[screenType]}`,
			actor: {
				name: `mirror-${screenType}-${user.id.toString()}`,
				appearance: {enabled: false,},
				exclusiveToUser: user.id,
				collider: {geometry: {shape: MRE.ColliderType.Box},},
			}
		});
		return lib;
	}
	private handleUserLeft = (user: MyScreenUser) => {
		user.screen3D?.setBehavior(null);
		user.screen3D?.destroy();
		user.screen3D = undefined;
		user.screen2D?.setBehavior(null);
		user.screen2D?.destroy();
		user.screen2D = undefined;
	};

	private started = () => {
		console.log("App Started");
		this.initialized = true;
	};

	private stopped = () => {
		for(const user of this.context.users as MyScreenUser[]) {
			this.handleUserLeft(user);
		}
		console.log("App Stopped");
	};
}
